import {
  Alert,
  AlertActionCloseButton,
  BreadcrumbItem,
  Button,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Skeleton,
  Split,
  SplitItem,
  Truncate,
  Tooltip,
} from '@patternfly/react-core';
import {
  CogIcon,
  DownloadIcon,
  OpenDrawerRightIcon,
  RedoIcon,
  StopCircleIcon,
} from '@patternfly/react-icons';
import { InvalidPipelineRun, StopRunModal } from '@odh-dashboard/autox-core/ui/components/feature';
import { ContextBreadcrumb } from '@odh-dashboard/autox-core/ui/components/primitive';
import { useFetchS3File, useS3ListFilesQuery } from '@odh-dashboard/autox-core/ui/hooks';
import { parseErrorStatus } from '@odh-dashboard/autox-core/ui/utils';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { Link, useLocation, useParams } from 'react-router';
import AutoragHeader from '~/app/components/common/AutoragHeader/AutoragHeader';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import AutoragResults from '~/app/components/run-results/AutoragResults';
import AutoragInputParametersPanel from '~/app/components/run-results/AutoragInputParametersPanel';
import PlaygroundDrawerPanel from '~/app/components/run-results/PlaygroundDrawerPanel';
import type { PlaygroundPatternInfo } from '~/app/components/run-results/PlaygroundDrawerPanel';
import { AutoragResultsContext, getAutoragContext } from '~/app/context/AutoragResultsContext';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { useAutoragRunActions } from '~/app/hooks/useAutoragRunActions';
import { useNotification } from '~/app/hooks/useNotification';
import { usePipelineRunQuery } from '~/app/hooks/usePipelineRunQuery';
import { useSecretCredentialsQuery } from '~/app/hooks/useSecretCredentialsQuery';
import { useAutoragOutputDir } from '~/app/hooks/useAutoragOutputDir';
import { resolveArtifactDirectory, useAutoragResults } from '~/app/hooks/useAutoragResults';
import { useComponentStageMap } from '~/app/hooks/useComponentStageMap';
import { useComponentStatuses } from '~/app/hooks/useComponentStatuses';
import { isRunInTerminalState } from '~/app/types/pipeline';
import { autoragExperimentsPathname, autoragReconfigurePathname } from '~/app/utilities/routes';
import {
  downloadBlob,
  isRunCompleted,
  isRunRetryable,
  isRunTerminatable,
} from '~/app/utilities/utils';
import { getObjectiveMetric, metricLabel } from '~/app/utilities/metricUtils';
import ViewCodeModal from '~/app/components/run-results/ViewCodeModal';
import type { AutoragPattern, ResponsesTemplate } from '~/app/types/autoragPattern';
import {
  AUTORAG_EVENTS,
  fireAutoragCodeSnippetsExported,
  fireAutoragStarterKitDownloaded,
  fireAutoragPlaygroundOpened,
  fireAutoragResultsViewed,
  isAutoragResultsNavigationState,
  TrackingOutcome,
} from '~/app/utilities/tracking';
import type { PlaygroundOpenedSource, ViewCodeEntrySource } from '~/app/utilities/tracking';

type DrawerContentType =
  | { type: 'run-details' }
  | {
      type: 'playground';
      responsesTemplate: ResponsesTemplate;
      patternInfo: PlaygroundPatternInfo;
    };

const STARTER_KIT_FILENAME = 'starter_kit.zip';
const ARTIFACT_AVAILABLE_TOOLTIP = 'Available after the run completes successfully';
const ARTIFACT_CHECKING_TOOLTIP = 'Checking artifact availability...';
const ARTIFACT_UNSUCCESSFUL_TOOLTIP = 'Unavailable because the run did not complete successfully';
const ARTIFACT_UNAVAILABLE_TOOLTIP = 'Artifact unavailable';

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

// ai4rag >= 0.18.0 renamed the pattern payload's `vector_store_binding` settings
// field to `store_binding` (backend-agnostic naming). It isn't declared on
// AutoragPatternSettings — zod's `.passthrough()` still preserves it on the raw
// object — so read it defensively here until pattern parsing itself is updated
// to normalize both names.
type PatternSettingsWithStoreBindingFallback = {
  store_binding?: { provider_type?: string; collection_name?: string };
};

const hasStoreBindingFallback = (
  settings: unknown,
): settings is PatternSettingsWithStoreBindingFallback =>
  typeof settings === 'object' && settings !== null && 'store_binding' in settings;

const buildResponsesTemplate = (
  pattern: AutoragPattern,
  runId: string | undefined,
): ResponsesTemplate => {
  const { generation, retrieval, vector_store_binding: vectorStoreBinding } = pattern.settings;
  const { settings } = pattern;
  const storeBindingFallback = hasStoreBindingFallback(settings)
    ? settings.store_binding
    : undefined;
  const collectionName =
    vectorStoreBinding?.collection_name ?? storeBindingFallback?.collection_name;
  const searchMode =
    retrieval.search_mode === 'hybrid' ||
    retrieval.search_mode === 'keyword' ||
    retrieval.search_mode === 'semantic'
      ? retrieval.search_mode
      : 'semantic';
  const rankerStrategy =
    retrieval.ranker_strategy === 'rrf' ||
    retrieval.ranker_strategy === 'linear' ||
    retrieval.ranker_strategy === 'cross_encoder'
      ? retrieval.ranker_strategy
      : 'rrf';

  return {
    /* eslint-disable camelcase */
    model: generation.model_id,
    stream: true,
    store: false,
    input: [
      {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: '<user_query_placeholder>' }],
      },
    ],
    metadata: {
      autorag_run_id: runId ?? '',
      rag_pattern_name: pattern.name,
    },
    instructions: '',
    tools: [
      {
        type: 'file_search',
        vector_store_ids: collectionName ? [collectionName] : [],
        max_num_results: retrieval.number_of_chunks,
        ranking_options: {
          search_mode: searchMode,
          ranker_strategy: rankerStrategy,
          ranker_k: 60,
          ranker_alpha: retrieval.ranker_alpha ?? 0.5,
        },
      },
    ],
    tool_choice: { type: 'file_search' },
    include: ['file_search_call.results'],
    /* eslint-enable camelcase */
  };
};

function AutoragResultsPage(): React.JSX.Element {
  const { namespace, runId } = useParams();
  const location = useLocation();
  const { namespaces, namespacesLoaded, namespacesLoadError } =
    useNamespaceSelectorWithPersistence();
  const [drawerContent, setDrawerContent] = React.useState<DrawerContentType | null>(null);
  const isDrawerOpen = drawerContent !== null;
  const handleDrawerClose = React.useCallback(() => setDrawerContent(null), []);

  // Close drawer on route changes
  const locationKey = location.key;
  React.useEffect(() => {
    setDrawerContent(null);
  }, [locationKey]);
  const [isStopModalOpen, setIsStopModalOpen] = React.useState(false);
  const [starterKitDownloadError, setStarterKitDownloadError] = React.useState<string>();
  const starterKitDownloadGeneration = React.useRef(0);
  const starterKitDownloadController = React.useRef<AbortController | null>(null);

  React.useLayoutEffect(() => {
    starterKitDownloadGeneration.current += 1;
    starterKitDownloadController.current?.abort();
    starterKitDownloadController.current = null;
    setStarterKitDownloadError(undefined);

    return () => {
      starterKitDownloadGeneration.current += 1;
      starterKitDownloadController.current?.abort();
      starterKitDownloadController.current = null;
    };
  }, [namespace, runId]);

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const getRedirectPath = (ns: string) => `${autoragExperimentsPathname}/${ns}`;
  const projectDisplayName = React.useMemo(
    () => namespaces.find((ns) => ns.name === namespace)?.displayName ?? namespace ?? '',
    [namespaces, namespace],
  );

  const notification = useNotification();
  const fetchS3File = useFetchS3File();

  const {
    data: pipelineRun,
    isPending: pipelineRunPending,
    isFetching: pipelineRunFetching,
    isError: pipelineRunError,
    error: pipelineRunLoadError,
    dataUpdatedAt: pipelineRunUpdatedAt,
  } = usePipelineRunQuery(runId, namespace);

  const { rootDir, patternGenerationDir } = useAutoragOutputDir(pipelineRun);
  const templatesOptimizationPath =
    isRunCompleted(pipelineRun?.state) && runId ? `${rootDir}/${runId}` : undefined;
  const artifactDiscoveryPath = templatesOptimizationPath
    ? `${templatesOptimizationPath}/${patternGenerationDir}`
    : undefined;
  const {
    data: artifactDiscoveryFiles,
    isLoading: artifactDiscoveryLoading,
    isError: artifactDiscoveryError,
  } = useS3ListFilesQuery(namespace, artifactDiscoveryPath);
  const artifactUuid = React.useMemo(() => {
    if (!artifactDiscoveryFiles || !artifactDiscoveryPath) {
      return undefined;
    }
    return resolveArtifactDirectory(artifactDiscoveryFiles.common_prefixes, artifactDiscoveryPath)
      .id;
  }, [artifactDiscoveryFiles, artifactDiscoveryPath]);
  const artifactDirectory = artifactUuid ? `${artifactDiscoveryPath}/${artifactUuid}` : undefined;
  const {
    data: starterKitFiles,
    isLoading: starterKitLoading,
    isError: starterKitError,
  } = useS3ListFilesQuery(
    namespace,
    artifactDirectory ? `${artifactDirectory}/starter_kit` : undefined,
  );
  const starterKitKey = artifactDirectory
    ? `${artifactDirectory}/starter_kit/${STARTER_KIT_FILENAME}`
    : undefined;
  const hasStarterKit = Boolean(
    starterKitKey && starterKitFiles?.contents.some((object) => object.key === starterKitKey),
  );
  const runArtifactLoading = artifactDiscoveryLoading || starterKitLoading;
  const runArtifactListError = artifactDiscoveryError || starterKitError;

  const starterKitTooltip = React.useMemo(() => {
    if (!isRunCompleted(pipelineRun?.state)) {
      return isRunInTerminalState(pipelineRun?.state)
        ? ARTIFACT_UNSUCCESSFUL_TOOLTIP
        : ARTIFACT_AVAILABLE_TOOLTIP;
    }
    if (runArtifactLoading) {
      return ARTIFACT_CHECKING_TOOLTIP;
    }
    return hasStarterKit && !runArtifactListError ? undefined : ARTIFACT_UNAVAILABLE_TOOLTIP;
  }, [hasStarterKit, pipelineRun?.state, runArtifactListError, runArtifactLoading]);
  const starterKitDisabled = Boolean(starterKitTooltip);

  const handleDownloadStarterKit = React.useCallback(async () => {
    if (starterKitDisabled || !namespace || !starterKitKey) {
      return;
    }

    const downloadGeneration = ++starterKitDownloadGeneration.current;
    const controller = new AbortController();
    starterKitDownloadController.current = controller;
    setStarterKitDownloadError(undefined);
    try {
      const starterKit = await fetchS3File(namespace, starterKitKey, {
        signal: controller.signal,
      });
      if (
        downloadGeneration !== starterKitDownloadGeneration.current ||
        starterKitDownloadController.current !== controller ||
        controller.signal.aborted
      ) {
        return;
      }
      downloadBlob(starterKit, STARTER_KIT_FILENAME);
      fireAutoragStarterKitDownloaded();
    } catch (error) {
      if (
        isAbortError(error) ||
        downloadGeneration !== starterKitDownloadGeneration.current ||
        starterKitDownloadController.current !== controller ||
        controller.signal.aborted
      ) {
        return;
      }
      setStarterKitDownloadError(
        error instanceof Error ? error.message : 'An unknown error occurred',
      );
    } finally {
      if (
        downloadGeneration === starterKitDownloadGeneration.current &&
        starterKitDownloadController.current === controller
      ) {
        starterKitDownloadController.current = null;
      }
    }
  }, [fetchS3File, namespace, starterKitDisabled, starterKitKey]);

  const { handleRetry, handleConfirmStop, isRetrying, isTerminating } = useAutoragRunActions(
    namespace ?? '',
    runId ?? '',
    'resultsPage',
  );

  // Two-tier error strategy: polling errors (data already loaded) show a non-blocking
  // notification with stale data, while initial load errors (no data yet) show a full error page.
  const hasPreviousData = !!pipelineRun;
  const isPollingError = pipelineRunError && hasPreviousData;
  const isInitialLoadError = pipelineRunError && !hasPreviousData;

  React.useEffect(() => {
    if (isPollingError) {
      notification.warning(
        'Pipeline run status update failed',
        'The status update has failed consistently for multiple attempts. The displayed results may not reflect the current state of the pipeline run.',
      );
    }
  }, [isPollingError, notification]);

  const invalidPipelineRunId =
    isInitialLoadError &&
    pipelineRunLoadError instanceof Error &&
    parseErrorStatus(pipelineRunLoadError) === 404;

  const resultsViewedTrackedRunId = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (!pipelineRun?.run_id || resultsViewedTrackedRunId.current === pipelineRun.run_id) {
      return;
    }
    resultsViewedTrackedRunId.current = pipelineRun.run_id;

    const navState = isAutoragResultsNavigationState(location.state) ? location.state : undefined;
    fireAutoragResultsViewed(navState?.entrySource ?? 'other');
  }, [pipelineRun?.run_id, location.state]);

  // Fetch and process AutoRAG results using custom hook
  const {
    patterns,
    failedPatterns,
    isLoading: patternsLoading,
    isError: patternsError,
    error: patternsLoadError,
    refetch: refetchPatterns,
    ragPatternsBasePath,
  } = useAutoragResults(runId, namespace, pipelineRun);

  const {
    componentStageMap: rawComponentStageMap,
    isLoading: componentStageMapLoading,
    isError: componentStageMapError,
  } = useComponentStageMap(runId, namespace, pipelineRun);

  const { mergedStageMap: componentStageMap, isLoading: componentStatusesLoading } =
    useComponentStatuses(runId, namespace, pipelineRun, rawComponentStageMap, pipelineRunUpdatedAt);

  const failedPatternsNotifiedKey = React.useRef('');
  React.useEffect(() => {
    // Wait for all queries to settle; without this guard each individual pattern
    // failure triggers a separate notification as the failedPatterns array grows.
    if (patternsLoading) {
      return;
    }
    if (failedPatterns.length === 0) {
      failedPatternsNotifiedKey.current = '';
      return;
    }
    const key = [...failedPatterns].toSorted().join(',');
    if (failedPatternsNotifiedKey.current !== key) {
      failedPatternsNotifiedKey.current = key;
      const total = failedPatterns.length + Object.keys(patterns).length;
      notification.warning(
        `${failedPatterns.length} of ${total} patterns could not be loaded`,
        `The following patterns failed to load: ${failedPatterns.join(', ')}`,
      );
    }
  }, [failedPatterns, patterns, notification, patternsLoading]);

  const runTerminatable = isRunTerminatable(pipelineRun?.state);
  const runRetryable = isRunRetryable(pipelineRun?.state);

  const handleStop = React.useCallback(async () => {
    try {
      await handleConfirmStop();
      setIsStopModalOpen(false);
    } catch {
      // Keep modal open on failure; error notification is shown by the hook.
    }
  }, [handleConfirmStop]);

  const ReconfigureLink = React.useCallback(
    (props: React.ComponentProps<typeof Link>) => (
      <Link
        {...props}
        to={`${autoragReconfigurePathname}/${namespace}/${runId}`}
        state={{ from: 'results' }}
      />
    ),
    [namespace, runId],
  );

  const ogxSecretName =
    typeof pipelineRun?.runtime_config?.parameters?.ogx_secret_name === 'string'
      ? pipelineRun.runtime_config.parameters.ogx_secret_name
      : undefined;

  const { data: secretData, isError: secretFetchError } = useSecretCredentialsQuery(
    namespace,
    ogxSecretName,
  );

  React.useEffect(() => {
    if (secretFetchError) {
      notification.warning(
        'Could not load Open GenAI Stack credentials',
        'Credentials could not be fetched.',
      );
    }
  }, [secretFetchError, notification]);

  const ogxCredentials = React.useMemo(() => {
    if (!secretData?.OGX_CLIENT_BASE_URL || !secretData.OGX_CLIENT_API_KEY) {
      return undefined;
    }
    return {
      baseUrl: secretData.OGX_CLIENT_BASE_URL,
      apiKey: secretData.OGX_CLIENT_API_KEY,
    };
  }, [secretData]);

  const contextValue = React.useMemo(
    () =>
      getAutoragContext({
        pipelineRun,
        patterns,
        pipelineRunLoading: pipelineRunPending || pipelineRunFetching,
        patternsLoading,
        patternsError,
        patternsLoadError,
        onRetryPatterns: refetchPatterns,
        ragPatternsBasePath,
        ogxCredentials,
        componentStageMap,
        componentStageMapLoading: componentStageMapLoading || componentStatusesLoading,
        componentStageMapError,
      }),
    [
      pipelineRun,
      patterns,
      pipelineRunPending,
      pipelineRunFetching,
      patternsLoading,
      patternsError,
      patternsLoadError,
      refetchPatterns,
      ragPatternsBasePath,
      ogxCredentials,
      componentStageMap,
      componentStageMapLoading,
      componentStatusesLoading,
      componentStageMapError,
    ],
  );

  /* eslint-disable @typescript-eslint/no-unnecessary-condition */
  // Opens (or switches the pattern within) the playground drawer. Returns whether a pattern was
  // actually opened, so callers can decide whether to fire tracking — this function itself never
  // fires tracking, since it's also used to switch patterns from within an already-open drawer
  // (see `onSelectPattern` below), which is not a new "open".
  const openPlaygroundForPattern = React.useCallback(
    (patternName: string): boolean => {
      const pattern = patterns?.[patternName];
      if (!pattern) {
        return false;
      }
      const responsesTemplate =
        pattern.inference?.responses_template ??
        buildResponsesTemplate(pattern, pipelineRun?.run_id);

      const metricMean = getObjectiveMetric(pattern, contextValue.optimizationMetric)?.scores.mean;
      setDrawerContent({
        type: 'playground',
        responsesTemplate,
        patternInfo: {
          patternName,
          modelId: pattern.settings?.generation?.model_id || 'N/A',
          optimizedMetricName: metricLabel(contextValue.optimizationMetric),
          optimizedMetricValue:
            metricMean != null && Number.isFinite(metricMean) ? metricMean : 'N/A',
          chunkMethod: pattern.settings?.chunking?.method || 'N/A',
        },
      });
      return true;
    },
    [contextValue.optimizationMetric, patterns, pipelineRun?.run_id],
  );
  /* eslint-enable @typescript-eslint/no-unnecessary-condition */

  const handleTryPattern = React.useCallback(
    (patternName: string, source: PlaygroundOpenedSource) => {
      if (openPlaygroundForPattern(patternName)) {
        fireAutoragPlaygroundOpened(source);
      }
    },
    [openPlaygroundForPattern],
  );

  const [viewCodePattern, setViewCodePattern] = React.useState<{
    patternName: string;
    responsesTemplate: ResponsesTemplate;
  } | null>(null);

  const handleViewCode = React.useCallback(
    (patternName: string, source: ViewCodeEntrySource) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const responsesTemplate = patterns?.[patternName]?.inference?.responses_template;
      if (responsesTemplate) {
        setViewCodePattern({ patternName, responsesTemplate });
        fireAutoragCodeSnippetsExported('viewed', source);
      }
    },
    [patterns],
  );

  return (
    <AutoragResultsContext.Provider value={contextValue}>
      <Drawer isExpanded={isDrawerOpen} position="end">
        <DrawerContent
          panelContent={
            drawerContent?.type === 'run-details' ? (
              <AutoragInputParametersPanel
                onClose={handleDrawerClose}
                parameters={contextValue.parameters}
                isLoading={pipelineRunPending}
              />
            ) : drawerContent?.type === 'playground' ? (
              <PlaygroundDrawerPanel
                namespace={namespace ?? ''}
                responsesTemplate={drawerContent.responsesTemplate}
                patternInfo={drawerContent.patternInfo}
                onClose={handleDrawerClose}
                onSelectPattern={openPlaygroundForPattern}
                onViewCode={(patternName) => handleViewCode(patternName, 'playground')}
              />
            ) : undefined
          }
        >
          <DrawerContentBody>
            <ApplicationsPage
              title={<AutoragHeader />}
              subtext={
                <h2 className="pf-v6-u-mt-sm">
                  {pipelineRun ? (
                    <span>
                      &quot;
                      <Truncate content={pipelineRun.display_name || ''} />
                      &quot; results
                    </span>
                  ) : (
                    <Skeleton width="300px" />
                  )}
                </h2>
              }
              headerAction={
                <Split hasGutter>
                  <SplitItem>
                    {runTerminatable && (
                      <Button
                        variant="link"
                        icon={<StopCircleIcon />}
                        onClick={() => setIsStopModalOpen(true)}
                        isDisabled={isTerminating || isStopModalOpen}
                        isLoading={isTerminating || isStopModalOpen}
                        spinnerAriaValueText="Stopping run"
                        data-testid="stop-run-button"
                      >
                        Stop
                      </Button>
                    )}
                    {runRetryable && (
                      <Button
                        variant="link"
                        icon={<RedoIcon />}
                        onClick={() => void handleRetry().catch(() => undefined)}
                        isDisabled={isRetrying}
                        isLoading={isRetrying}
                        spinnerAriaValueText="Retrying run"
                        data-testid="retry-run-button"
                      >
                        Retry
                      </Button>
                    )}
                  </SplitItem>
                  <SplitItem>
                    <Button
                      variant="link"
                      icon={<CogIcon />}
                      component={ReconfigureLink}
                      data-testid="reconfigure-run-button"
                    >
                      Reconfigure
                    </Button>
                  </SplitItem>
                  <SplitItem>
                    <Tooltip
                      content={starterKitTooltip}
                      trigger={starterKitDisabled ? 'mouseenter focus' : ''}
                    >
                      <Button
                        variant="link"
                        icon={<DownloadIcon />}
                        onClick={() => void handleDownloadStarterKit()}
                        isAriaDisabled={starterKitDisabled}
                        data-testid="starter-kit-download-button"
                      >
                        Download starter kit
                      </Button>
                    </Tooltip>
                  </SplitItem>
                  <SplitItem>
                    <Button
                      variant="link"
                      icon={<OpenDrawerRightIcon />}
                      onClick={() =>
                        setDrawerContent((prev) =>
                          prev?.type === 'run-details' ? null : { type: 'run-details' },
                        )
                      }
                      aria-expanded={drawerContent?.type === 'run-details'}
                      data-testid="run-details-button"
                    >
                      Run details
                    </Button>
                  </SplitItem>
                </Split>
              }
              breadcrumb={
                namespace ? (
                  <ContextBreadcrumb
                    pageName="AutoRAG"
                    projectDisplayName={projectDisplayName}
                    homePath={getRedirectPath(namespace)}
                    projectHomePath={`/projects/${namespace}`}
                    homeTestId="experiment-breadcrumb-home"
                    projectLinkTestId="project-navigator-link-in-breadcrumb"
                  >
                    <BreadcrumbItem data-testid="results-breadcrumb-experiment-configurations">
                      <Link
                        to={`${autoragReconfigurePathname}/${namespace}/${runId}`}
                        state={{ from: 'results' }}
                      >
                        Run configurations
                      </Link>
                    </BreadcrumbItem>
                    <BreadcrumbItem isActive>Run results</BreadcrumbItem>
                  </ContextBreadcrumb>
                ) : undefined
              }
              empty={noNamespaces || invalidNamespace || invalidPipelineRunId}
              emptyStatePage={
                invalidPipelineRunId ? (
                  <InvalidPipelineRun productName="AutoRAG" />
                ) : (
                  <InvalidProject namespace={namespace} getRedirectPath={getRedirectPath} />
                )
              }
              loadError={
                hasPreviousData ? undefined : (pipelineRunLoadError ?? namespacesLoadError)
              }
              loaded={namespacesLoaded && !pipelineRunPending}
            >
              {starterKitDownloadError && (
                <Alert
                  variant="danger"
                  title="Starter kit download failed"
                  actionClose={
                    <AlertActionCloseButton onClose={() => setStarterKitDownloadError(undefined)} />
                  }
                >
                  {starterKitDownloadError}
                </Alert>
              )}
              <AutoragResults onTryPattern={handleTryPattern} onViewCode={handleViewCode} />
            </ApplicationsPage>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
      <StopRunModal
        isOpen={isStopModalOpen}
        onClose={() => setIsStopModalOpen(false)}
        onConfirm={handleStop}
        isTerminating={isTerminating}
        runName={pipelineRun?.display_name}
        onCancel={() =>
          fireFormTrackingEvent(AUTORAG_EVENTS.RUN_STOPPED, {
            outcome: TrackingOutcome.cancel,
            source: 'resultsPage',
          })
        }
      />
      {viewCodePattern && (
        <ViewCodeModal
          isOpen
          onClose={() => setViewCodePattern(null)}
          patternName={viewCodePattern.patternName}
          responsesTemplate={viewCodePattern.responsesTemplate}
          ogxCredentials={ogxCredentials}
        />
      )}
    </AutoragResultsContext.Provider>
  );
}

export default AutoragResultsPage;

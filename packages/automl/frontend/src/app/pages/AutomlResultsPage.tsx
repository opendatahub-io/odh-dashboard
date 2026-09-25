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
import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { Link, useLocation, useParams } from 'react-router';
import AutomlHeader from '~/app/components/common/AutomlHeader/AutomlHeader';
import ExperimentContextBreadcrumb from '~/app/components/common/ExperimentContextBreadcrumb';
import InvalidPipelineRun from '~/app/components/empty-states/InvalidPipelineRun';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import AutomlResults from '~/app/components/run-results/AutomlResults';
import AutomlInputParametersPanel from '~/app/components/run-results/AutomlInputParametersPanel';
import StopRunModal from '~/app/components/run-results/StopRunModal';
import { AutomlResultsContext, getAutomlContext } from '~/app/context/AutomlResultsContext';
import { useAutomlRunActions } from '~/app/hooks/useAutomlRunActions';
import { useNotification } from '~/app/hooks/useNotification';
import { fetchS3File, usePipelineRunQuery, useS3ListFilesQuery } from '~/app/hooks/queries';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { useAutomlOutputDir } from '~/app/hooks/useAutomlOutputDir';
import { useAutomlResults } from '~/app/hooks/useAutomlResults';
import { useComponentStageMap } from '~/app/hooks/useComponentStageMap';
import { useComponentStatuses } from '~/app/hooks/useComponentStatuses';
import { automlExperimentsPathname, automlReconfigurePathname } from '~/app/utilities/routes';
import {
  downloadBlob,
  isRunCompleted,
  isRunInTerminalState,
  isRunRetryable,
  isRunTerminatable,
  parseErrorStatus,
} from '~/app/utilities/utils';
import {
  fireAutomlResultsViewed,
  fireAutomlRunNotebookDownloaded,
  isAutomlResultsNavigationState,
} from '~/app/utilities/tracking';

const RUN_NOTEBOOK_FILENAME = 'automl_experiment_notebook.ipynb';
const ARTIFACT_AVAILABLE_TOOLTIP = 'Available after the run completes successfully';
const ARTIFACT_UNSUCCESSFUL_TOOLTIP = 'Unavailable because the run did not complete successfully';
const ARTIFACT_UNAVAILABLE_TOOLTIP = 'Artifact unavailable';
const ARTIFACT_DOWNLOADING_TOOLTIP = 'Downloading...';

function AutomlResultsPage(): React.JSX.Element {
  const { namespace, runId } = useParams();
  const location = useLocation();
  const { namespaces, namespacesLoaded, namespacesLoadError } =
    useNamespaceSelectorWithPersistence();
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const handleDrawerClose = React.useCallback(() => setIsDrawerOpen(false), []);
  const [isStopModalOpen, setIsStopModalOpen] = React.useState(false);
  const [stopInitiated, setStopInitiated] = React.useState(false);
  const [runNotebookDownloadError, setRunNotebookDownloadError] = React.useState<string>();
  const [isDownloadingRunNotebook, setIsDownloadingRunNotebook] = React.useState(false);
  const { handleRetry, handleConfirmStop, isRetrying, isTerminating } = useAutomlRunActions(
    namespace ?? '',
    runId ?? '',
    'resultsPage',
  );

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const getRedirectPath = (ns: string) => `${automlExperimentsPathname}/${ns}`;
  const projectDisplayName = React.useMemo(
    () => namespaces.find((ns) => ns.name === namespace)?.displayName ?? namespace ?? '',
    [namespaces, namespace],
  );

  const notification = useNotification();

  const {
    data: pipelineRun,
    isPending: pipelineRunPending,
    isFetching: pipelineRunFetching,
    isError: pipelineRunError,
    error: pipelineRunLoadError,
    dataUpdatedAt: pipelineRunUpdatedAt,
  } = usePipelineRunQuery(runId, namespace);

  const { rootDir } = useAutomlOutputDir(pipelineRun);
  const runArtifactRoot =
    isRunCompleted(pipelineRun?.state) && runId ? `${rootDir}/${runId}` : undefined;
  const runNotebookKey = runArtifactRoot
    ? `${runArtifactRoot}/${RUN_NOTEBOOK_FILENAME}`
    : undefined;
  const {
    data: runArtifactFiles,
    isLoading: runArtifactLoading,
    isError: runArtifactListError,
  } = useS3ListFilesQuery(namespace, runArtifactRoot);
  const hasRunNotebook = Boolean(
    runNotebookKey && runArtifactFiles?.contents.some((object) => object.key === runNotebookKey),
  );

  const runNotebookTooltip = React.useMemo(() => {
    if (isDownloadingRunNotebook) {
      return ARTIFACT_DOWNLOADING_TOOLTIP;
    }
    if (!isRunCompleted(pipelineRun?.state)) {
      return isRunInTerminalState(pipelineRun?.state)
        ? ARTIFACT_UNSUCCESSFUL_TOOLTIP
        : ARTIFACT_AVAILABLE_TOOLTIP;
    }
    if (runArtifactLoading) {
      return ARTIFACT_AVAILABLE_TOOLTIP;
    }
    return hasRunNotebook && !runArtifactListError ? undefined : ARTIFACT_UNAVAILABLE_TOOLTIP;
  }, [
    hasRunNotebook,
    isDownloadingRunNotebook,
    pipelineRun?.state,
    runArtifactListError,
    runArtifactLoading,
  ]);
  const runNotebookDisabled = Boolean(runNotebookTooltip);

  const handleDownloadRunNotebook = React.useCallback(async () => {
    if (runNotebookDisabled || !namespace || !runNotebookKey) {
      return;
    }

    setRunNotebookDownloadError(undefined);
    setIsDownloadingRunNotebook(true);
    try {
      const notebook = await fetchS3File(namespace, runNotebookKey);
      downloadBlob(notebook, RUN_NOTEBOOK_FILENAME);
      fireAutomlRunNotebookDownloaded();
    } catch (error) {
      setRunNotebookDownloadError(
        error instanceof Error ? error.message : 'An unknown error occurred',
      );
    } finally {
      setIsDownloadingRunNotebook(false);
    }
  }, [namespace, runNotebookDisabled, runNotebookKey]);

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

    const navState = isAutomlResultsNavigationState(location.state) ? location.state : undefined;
    fireAutomlResultsViewed(navState?.entrySource ?? 'other');
  }, [pipelineRun?.run_id, location.state]);

  // Fetch and process AutoML results using custom hook
  const {
    models,
    failedModels,
    isLoading: modelsLoading,
    isError: modelsError,
    error: modelsLoadError,
    modelsBasePath,
    refetch: refetchModels,
  } = useAutomlResults(runId, namespace, pipelineRun);

  const {
    componentStageMap: rawComponentStageMap,
    isLoading: componentStageMapLoading,
    isError: componentStageMapError,
  } = useComponentStageMap(runId, namespace, pipelineRun);

  const { mergedStageMap: componentStageMap, isLoading: componentStatusesLoading } =
    useComponentStatuses(runId, namespace, pipelineRun, rawComponentStageMap, pipelineRunUpdatedAt);

  const failedModelsNotifiedKey = React.useRef('');
  React.useEffect(() => {
    const key = [...failedModels].toSorted().join(',');
    if (failedModels.length > 0 && failedModelsNotifiedKey.current !== key) {
      failedModelsNotifiedKey.current = key;
      const total = failedModels.length + Object.keys(models).length;
      notification.warning(
        `${failedModels.length} of ${total} models could not be loaded`,
        `The following models failed to load: ${failedModels.join(', ')}`,
      );
    }
  }, [failedModels, models, notification]);

  const runTerminatable = isRunTerminatable(pipelineRun?.state);
  const runRetryable = isRunRetryable(pipelineRun?.state);

  // Track previous terminatable state to detect transitions
  const prevRunTerminatable = React.useRef(runTerminatable);
  React.useEffect(() => {
    // Reset stopInitiated only when transitioning from non-terminatable to terminatable (e.g., after retry)
    if (runTerminatable && !prevRunTerminatable.current) {
      setStopInitiated(false);
    }
    prevRunTerminatable.current = runTerminatable;
  }, [runTerminatable]);

  const handleStop = React.useCallback(async () => {
    try {
      await handleConfirmStop();
      setStopInitiated(true);
      setIsStopModalOpen(false);
    } catch {
      // Keep modal open on failure; error notification is shown by the hook.
    }
  }, [handleConfirmStop]);

  const ReconfigureLink = React.useCallback(
    (props: React.ComponentProps<typeof Link>) => (
      <Link
        {...props}
        to={`${automlReconfigurePathname}/${namespace}/${runId}`}
        state={{ from: 'results' }}
      />
    ),
    [namespace, runId],
  );

  const contextValue = React.useMemo(
    () =>
      getAutomlContext({
        pipelineRun,
        models,
        pipelineRunLoading: pipelineRunPending || pipelineRunFetching,
        modelsLoading,
        modelsBasePath,
        modelsError,
        modelsLoadError,
        onRetryModels: refetchModels,
        componentStageMap,
        componentStageMapLoading: componentStageMapLoading || componentStatusesLoading,
        componentStageMapError,
      }),
    [
      pipelineRun,
      models,
      pipelineRunPending,
      pipelineRunFetching,
      modelsLoading,
      modelsBasePath,
      modelsError,
      modelsLoadError,
      refetchModels,
      componentStageMap,
      componentStageMapLoading,
      componentStatusesLoading,
      componentStageMapError,
    ],
  );

  return (
    <AutomlResultsContext.Provider value={contextValue}>
      <Drawer isExpanded={isDrawerOpen}>
        <DrawerContent
          panelContent={
            <AutomlInputParametersPanel
              onClose={handleDrawerClose}
              parameters={contextValue.parameters}
              isLoading={pipelineRunPending}
            />
          }
        >
          <DrawerContentBody>
            <ApplicationsPage
              title={<AutomlHeader />}
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
                    {runTerminatable && !stopInitiated && (
                      <Button
                        variant="secondary"
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
                        variant="secondary"
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
                    <Tooltip content={runNotebookTooltip}>
                      <Button
                        variant="secondary"
                        icon={<DownloadIcon />}
                        onClick={() => void handleDownloadRunNotebook()}
                        isAriaDisabled={runNotebookDisabled}
                        isLoading={isDownloadingRunNotebook}
                        spinnerAriaValueText="Downloading run notebook"
                        data-testid="run-notebook-download-button"
                      >
                        Download run notebook
                      </Button>
                    </Tooltip>
                  </SplitItem>
                  <SplitItem>
                    <Button
                      variant="secondary"
                      icon={<CogIcon />}
                      component={ReconfigureLink}
                      data-testid="reconfigure-run-button"
                    >
                      Reconfigure
                    </Button>
                  </SplitItem>
                  <SplitItem>
                    <Button
                      variant="link"
                      icon={<OpenDrawerRightIcon />}
                      onClick={() => setIsDrawerOpen((prev) => !prev)}
                      aria-expanded={isDrawerOpen}
                      data-testid="run-details-button"
                    >
                      Run details
                    </Button>
                  </SplitItem>
                </Split>
              }
              breadcrumb={
                namespace ? (
                  <ExperimentContextBreadcrumb
                    pageName="AutoML"
                    namespace={namespace}
                    projectDisplayName={projectDisplayName}
                    homePath={getRedirectPath(namespace)}
                  >
                    <BreadcrumbItem data-testid="results-breadcrumb-experiment-configurations">
                      <Link
                        to={`${automlReconfigurePathname}/${namespace}/${runId}`}
                        state={{ from: 'results' }}
                      >
                        Run configurations
                      </Link>
                    </BreadcrumbItem>
                    <BreadcrumbItem isActive>Run results</BreadcrumbItem>
                  </ExperimentContextBreadcrumb>
                ) : undefined
              }
              empty={noNamespaces || invalidNamespace || invalidPipelineRunId}
              emptyStatePage={
                invalidPipelineRunId ? (
                  <InvalidPipelineRun />
                ) : (
                  <InvalidProject namespace={namespace} getRedirectPath={getRedirectPath} />
                )
              }
              loadError={
                hasPreviousData ? undefined : (pipelineRunLoadError ?? namespacesLoadError)
              }
              loaded={namespacesLoaded && !pipelineRunPending}
            >
              {runNotebookDownloadError && (
                <Alert
                  variant="danger"
                  title="Run notebook download failed"
                  actionClose={
                    <AlertActionCloseButton
                      onClose={() => setRunNotebookDownloadError(undefined)}
                    />
                  }
                >
                  {runNotebookDownloadError}
                </Alert>
              )}
              <AutomlResults />
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
        source="resultsPage"
      />
    </AutomlResultsContext.Provider>
  );
}

export default AutomlResultsPage;

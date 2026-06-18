import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Skeleton,
  Split,
  SplitItem,
  Truncate,
} from '@patternfly/react-core';
import { CogIcon, OpenDrawerRightIcon, RedoIcon, StopCircleIcon } from '@patternfly/react-icons';
import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { Link, useLocation, useParams } from 'react-router';
import AutoragHeader from '~/app/components/common/AutoragHeader/AutoragHeader';
import InvalidPipelineRun from '~/app/components/empty-states/InvalidPipelineRun';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import AutoragResults from '~/app/components/run-results/AutoragResults';
import AutoragInputParametersPanel from '~/app/components/run-results/AutoragInputParametersPanel';
import PlaygroundDrawerPanel from '~/app/components/run-results/PlaygroundDrawerPanel';
import type { PlaygroundPatternInfo } from '~/app/components/run-results/PlaygroundDrawerPanel';
import StopRunModal from '~/app/components/run-results/StopRunModal';
import { AutoragResultsContext, getAutoragContext } from '~/app/context/AutoragResultsContext';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { useAutoragRunActions } from '~/app/hooks/useAutoragRunActions';
import { useNotification } from '~/app/hooks/useNotification';
import { usePipelineRunQuery } from '~/app/hooks/queries';
import { useAutoragResults } from '~/app/hooks/useAutoragResults';
import { useComponentStageMap } from '~/app/hooks/useComponentStageMap';
import { useComponentStatuses } from '~/app/hooks/useComponentStatuses';
import { autoragExperimentsPathname, autoragReconfigurePathname } from '~/app/utilities/routes';
import {
  formatMetricName,
  getOptimizedMetricForRAG,
  isRunTerminatable,
  isRunRetryable,
  parseErrorStatus,
} from '~/app/utilities/utils';
import ViewCodeModal from '~/app/components/run-results/ViewCodeModal';
import type { ResponsesTemplate } from '~/app/types/autoragPattern';

type DrawerContentType =
  | { type: 'run-details' }
  | {
      type: 'playground';
      responsesTemplate: ResponsesTemplate;
      patternInfo: PlaygroundPatternInfo;
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

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const getRedirectPath = (ns: string) => `${autoragExperimentsPathname}/${ns}`;

  const notification = useNotification();

  const {
    data: pipelineRun,
    isPending: pipelineRunPending,
    isFetching: pipelineRunFetching,
    isError: pipelineRunError,
    error: pipelineRunLoadError,
    dataUpdatedAt: pipelineRunUpdatedAt,
  } = usePipelineRunQuery(runId, namespace);

  const { handleRetry, handleConfirmStop, isRetrying, isTerminating } = useAutoragRunActions(
    namespace ?? '',
    runId ?? '',
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
    const key = [...failedPatterns].toSorted().join(',');
    if (failedPatterns.length > 0 && failedPatternsNotifiedKey.current !== key) {
      failedPatternsNotifiedKey.current = key;
      const total = failedPatterns.length + Object.keys(patterns).length;
      notification.warning(
        `${failedPatterns.length} of ${total} patterns could not be loaded`,
        `The following patterns failed to load: ${failedPatterns.join(', ')}`,
      );
    }
  }, [failedPatterns, patterns, notification]);

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
      componentStageMap,
      componentStageMapLoading,
      componentStatusesLoading,
      componentStageMapError,
    ],
  );

  /* eslint-disable @typescript-eslint/no-unnecessary-condition */
  const handleTryPattern = React.useCallback(
    (patternName: string) => {
      const pattern = patterns?.[patternName];
      if (!pattern) {
        return;
      }
      const responsesTemplate = pattern.settings?.responses_template;
      if (!responsesTemplate) {
        return;
      }

      const optimizedMetric = getOptimizedMetricForRAG(pipelineRun);
      const scoreLookup = Object.fromEntries(
        Object.entries(pattern.scores ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
      );
      const metricMean = scoreLookup[optimizedMetric.toLowerCase()]?.mean;
      setDrawerContent({
        type: 'playground',
        responsesTemplate,
        patternInfo: {
          patternName,
          modelId: pattern.settings?.generation?.model_id || 'N/A',
          optimizedMetricName: formatMetricName(optimizedMetric),
          optimizedMetricValue:
            metricMean != null && Number.isFinite(metricMean) ? metricMean : 'N/A',
          chunkMethod: pattern.settings?.chunking?.method || 'N/A',
        },
      });
    },
    [patterns, pipelineRun],
  );
  /* eslint-enable @typescript-eslint/no-unnecessary-condition */

  const [viewCodePattern, setViewCodePattern] = React.useState<{
    patternName: string;
    responsesTemplate: ResponsesTemplate;
  } | null>(null);

  const handleViewCode = React.useCallback(
    (patternName: string) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const responsesTemplate = patterns?.[patternName]?.settings?.responses_template;
      if (responsesTemplate) {
        setViewCodePattern({ patternName, responsesTemplate });
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
                onSelectPattern={handleTryPattern}
                onViewCode={handleViewCode}
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
                        variant="secondary"
                        icon={<StopCircleIcon />}
                        onClick={() => setIsStopModalOpen(true)}
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
                <Breadcrumb>
                  <BreadcrumbItem>
                    <Link to={getRedirectPath(namespace ?? '')}>AutoRAG: {namespace}</Link>
                  </BreadcrumbItem>
                  <BreadcrumbItem isActive>
                    <Truncate content={pipelineRun?.display_name || ''} />
                  </BreadcrumbItem>
                </Breadcrumb>
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
      />
      {viewCodePattern && (
        <ViewCodeModal
          isOpen
          onClose={() => setViewCodePattern(null)}
          patternName={viewCodePattern.patternName}
          responsesTemplate={viewCodePattern.responsesTemplate}
        />
      )}
    </AutoragResultsContext.Provider>
  );
}

export default AutoragResultsPage;

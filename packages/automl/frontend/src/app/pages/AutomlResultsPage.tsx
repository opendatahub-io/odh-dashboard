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
import { Link, useParams } from 'react-router';
import AutomlHeader from '~/app/components/common/AutomlHeader/AutomlHeader';
import InvalidPipelineRun from '~/app/components/empty-states/InvalidPipelineRun';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import AutomlResults from '~/app/components/run-results/AutomlResults';
import AutomlInputParametersPanel from '~/app/components/run-results/AutomlInputParametersPanel';
import StopRunModal from '~/app/components/run-results/StopRunModal';
import { AutomlResultsContext, getAutomlContext } from '~/app/context/AutomlResultsContext';
import { useAutomlRunActions } from '~/app/hooks/useAutomlRunActions';
import { useNotification } from '~/app/hooks/useNotification';
import { usePipelineRunQuery } from '~/app/hooks/queries';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { useAutomlResults } from '~/app/hooks/useAutomlResults';
import { automlExperimentsPathname, automlReconfigurePathname } from '~/app/utilities/routes';
import { isRunTerminatable, isRunRetryable, parseErrorStatus } from '~/app/utilities/utils';

function AutomlResultsPage(): React.JSX.Element {
  const { namespace, runId } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } =
    useNamespaceSelectorWithPersistence();
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const handleDrawerClose = React.useCallback(() => setIsDrawerOpen(false), []);
  const [isStopModalOpen, setIsStopModalOpen] = React.useState(false);
  const { handleRetry, handleConfirmStop, isRetrying, isTerminating } = useAutomlRunActions(
    namespace ?? '',
    runId ?? '',
  );

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const getRedirectPath = (ns: string) => `${automlExperimentsPathname}/${ns}`;

  const notification = useNotification();

  const {
    data: pipelineRun,
    isPending: pipelineRunPending,
    isFetching: pipelineRunFetching,
    isError: pipelineRunError,
    error: pipelineRunLoadError,
  } = usePipelineRunQuery(runId, namespace);

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

  // Fetch and process AutoML results using custom hook
  const {
    models,
    failedModels,
    isLoading: modelsLoading,
    isError: modelsError,
    error: modelsLoadError,
    refetch: refetchModels,
  } = useAutomlResults(runId, namespace, pipelineRun);

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
        modelsError,
        modelsLoadError,
        onRetryModels: refetchModels,
      }),
    [
      pipelineRun,
      models,
      pipelineRunPending,
      pipelineRunFetching,
      modelsLoading,
      modelsError,
      modelsLoadError,
      refetchModels,
    ],
  );

  return (
    <>
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
                <Breadcrumb>
                  <BreadcrumbItem>
                    <Link to={getRedirectPath(namespace!)}>AutoML: {namespace}</Link>
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
              <AutomlResultsContext.Provider value={contextValue}>
                <AutomlResults />
              </AutomlResultsContext.Provider>
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
    </>
  );
}

export default AutomlResultsPage;

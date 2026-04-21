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
import { OpenDrawerRightIcon, RedoIcon, StopCircleIcon } from '@patternfly/react-icons';
import { ApplicationsPage } from 'mod-arch-shared';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Link, useParams } from 'react-router';
import AutomlHeader from '~/app/components/common/AutomlHeader/AutomlHeader';
import InvalidPipelineRun from '~/app/components/empty-states/InvalidPipelineRun';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import AutomlResults from '~/app/components/run-results/AutomlResults';
import AutomlInputParametersPanel from '~/app/components/run-results/AutomlInputParametersPanel';
import StopRunModal from '~/app/components/run-results/StopRunModal';
import { AutomlResultsContext, getAutomlContext } from '~/app/context/AutomlResultsContext';
import {
  useRetryPipelineRunMutation,
  useTerminatePipelineRunMutation,
} from '~/app/hooks/mutations';
import { useNotification } from '~/app/hooks/useNotification';
import { usePipelineRunQuery } from '~/app/hooks/queries';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { useAutomlResults } from '~/app/hooks/useAutomlResults';
import { RuntimeStateKF } from '~/app/types/pipeline';
import { automlExperimentsPathname } from '~/app/utilities/routes';
import { parseErrorStatus } from '~/app/utilities/utils';

function AutomlResultsPage(): React.JSX.Element {
  const { namespace, runId } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } =
    useNamespaceSelectorWithPersistence();
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const handleDrawerClose = React.useCallback(() => setIsDrawerOpen(false), []);
  const [isStopModalOpen, setIsStopModalOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const notification = useNotification();
  const terminateMutation = useTerminatePipelineRunMutation(namespace ?? '', runId ?? '');
  const retryMutation = useRetryPipelineRunMutation(namespace ?? '', runId ?? '');

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const getRedirectPath = (ns: string) => `${automlExperimentsPathname}/${ns}`;

  const {
    data: pipelineRun,
    isPending: pipelineRunPending,
    isFetching: pipelineRunFetching,
    isError: pipelineRunError,
    error: pipelineRunLoadError,
  } = usePipelineRunQuery(runId, namespace);
  const invalidPipelineRunId =
    pipelineRunError &&
    pipelineRunLoadError instanceof Error &&
    parseErrorStatus(pipelineRunLoadError) === 404;

  // Fetch and process AutoML results using custom hook
  const {
    models,
    isLoading: modelsLoading,
    isError: modelsError,
    error: modelsLoadError,
  } = useAutomlResults(runId, namespace, pipelineRun);

  const runState = pipelineRun?.state.toUpperCase();
  const isRunActive =
    runState === RuntimeStateKF.RUNNING ||
    runState === RuntimeStateKF.PENDING ||
    runState === RuntimeStateKF.CANCELING ||
    runState === RuntimeStateKF.PAUSED;
  const isRunRetryable = runState === RuntimeStateKF.FAILED || runState === RuntimeStateKF.CANCELED;

  const handleRetry = React.useCallback(async () => {
    try {
      await retryMutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ['pipelineRun', runId, namespace] });
      notification.success(
        'Retry submitted successfully',
        'The process is asynchronous and may take some time to take effect',
      );
    } catch (error) {
      notification.error(
        'Failed to retry run',
        error instanceof Error ? error.message : 'An unknown error occurred',
      );
    }
  }, [retryMutation, queryClient, runId, namespace, notification]);

  const handleConfirmStop = React.useCallback(async () => {
    try {
      await terminateMutation.mutateAsync();
      notification.success(
        'Stop submitted successfully',
        'The process is asynchronous and may take some time to take effect',
      );
    } catch (error) {
      notification.error(
        'Failed to stop run',
        error instanceof Error ? error.message : 'An unknown error occurred',
      );
    } finally {
      setIsStopModalOpen(false);
    }
  }, [terminateMutation, notification]);

  const contextValue = React.useMemo(
    () =>
      getAutomlContext({
        pipelineRun,
        models,
        pipelineRunLoading: pipelineRunPending || pipelineRunFetching,
        modelsLoading,
      }),
    [pipelineRun, models, pipelineRunPending, pipelineRunFetching, modelsLoading],
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
                    {isRunActive && (
                      <Button
                        variant="secondary"
                        icon={<StopCircleIcon />}
                        onClick={() => setIsStopModalOpen(true)}
                        data-testid="stop-run-button"
                      >
                        Stop
                      </Button>
                    )}
                    {isRunRetryable && (
                      <Button
                        variant="secondary"
                        icon={<RedoIcon />}
                        onClick={handleRetry}
                        isDisabled={retryMutation.isPending}
                        isLoading={retryMutation.isPending}
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
              loadError={modelsLoadError ?? pipelineRunLoadError ?? namespacesLoadError}
              loaded={namespacesLoaded && !pipelineRunPending}
            >
              {!modelsError && (
                <AutomlResultsContext.Provider value={contextValue}>
                  <AutomlResults />
                </AutomlResultsContext.Provider>
              )}
            </ApplicationsPage>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
      <StopRunModal
        isOpen={isStopModalOpen}
        onClose={() => setIsStopModalOpen(false)}
        onConfirm={handleConfirmStop}
        isTerminating={terminateMutation.isPending}
      />
    </>
  );
}

export default AutomlResultsPage;

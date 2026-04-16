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
import { OpenDrawerRightIcon } from '@patternfly/react-icons';
import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import AutomlHeader from '~/app/components/common/AutomlHeader/AutomlHeader';
import InvalidPipelineRun from '~/app/components/empty-states/InvalidPipelineRun';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import AutomlResults from '~/app/components/run-results/AutomlResults';
import AutomlInputParametersPanel from '~/app/components/run-results/AutomlInputParametersPanel';
import StopRunModal from '~/app/components/run-results/StopRunModal';
import { AutomlResultsContext, getAutomlContext } from '~/app/context/AutomlResultsContext';
import {
  useCreatePipelineRunMutation,
  useTerminatePipelineRunMutation,
} from '~/app/hooks/mutations';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import { useNotification } from '~/app/hooks/useNotification';
import { usePipelineRunQuery } from '~/app/hooks/queries';
import { useAutomlResults } from '~/app/hooks/useAutomlResults';
import { RuntimeStateKF } from '~/app/types/pipeline';
import { automlExperimentsPathname, automlResultsPathname } from '~/app/utilities/routes';
import { parseErrorStatus } from '~/app/utilities/utils';

function AutomlResultsPage(): React.JSX.Element {
  const { namespace, runId } = useParams();
  const navigate = useNavigate();
  const { namespaces, namespacesLoaded, namespacesLoadError } = useNamespaceSelector();
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const handleDrawerClose = React.useCallback(() => setIsDrawerOpen(false), []);
  const [isStopModalOpen, setIsStopModalOpen] = React.useState(false);
  const notification = useNotification();
  const terminateMutation = useTerminatePipelineRunMutation(namespace ?? '', runId ?? '');
  const createRunMutation = useCreatePipelineRunMutation(namespace ?? '');

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
    runState === RuntimeStateKF.CANCELING;
  const isRunFailed = runState === RuntimeStateKF.FAILED;

  const handleRetry = React.useCallback(async () => {
    if (!pipelineRun?.runtime_config?.parameters) {
      notification.error('Cannot retry', 'Run parameters are not available.');
      return;
    }
    const params = pipelineRun.runtime_config.parameters;
    const currentName = pipelineRun.display_name;
    const match = currentName.match(/^(.*) - (\d+)$/);
    const retryName = match ? `${match[1]} - ${Number(match[2]) + 1}` : `${currentName} - 1`;

    try {
      const newRun = await createRunMutation.mutateAsync({
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        ...(params as ConfigureSchema),
        // eslint-disable-next-line camelcase
        display_name: retryName,
        description: pipelineRun.description ?? '',
      });
      notification.success('Run restarted successfully');
      navigate(`${automlResultsPathname}/${namespace}/${newRun.run_id}`);
    } catch (error) {
      notification.error(
        'Failed to retry run',
        error instanceof Error ? error.message : 'An unknown error occurred',
      );
    }
  }, [pipelineRun, createRunMutation, navigate, namespace, notification]);

  const handleConfirmStop = React.useCallback(async () => {
    try {
      await terminateMutation.mutateAsync();
      notification.success('Run stopped successfully');
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
                        variant="danger"
                        onClick={() => setIsStopModalOpen(true)}
                        data-testid="stop-run-button"
                      >
                        Stop
                      </Button>
                    )}
                    {isRunFailed && (
                      <Button
                        variant="primary"
                        onClick={handleRetry}
                        isDisabled={createRunMutation.isPending}
                        isLoading={createRunMutation.isPending}
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

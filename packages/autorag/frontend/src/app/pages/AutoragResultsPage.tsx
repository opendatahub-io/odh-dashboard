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
import AutoragHeader from '~/app/components/common/AutoragHeader/AutoragHeader';
import InvalidPipelineRun from '~/app/components/empty-states/InvalidPipelineRun';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import AutoragResults from '~/app/components/run-results/AutoragResults';
import AutoragInputParametersPanel from '~/app/components/run-results/AutoragInputParametersPanel';
import StopRunModal from '~/app/components/run-results/StopRunModal';
import { AutoragResultsContext, getAutoragContext } from '~/app/context/AutoragResultsContext';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { useAutoragRunActions } from '~/app/hooks/useAutoragRunActions';
import { usePipelineRunQuery } from '~/app/hooks/queries';
import { useAutoragResults } from '~/app/hooks/useAutoragResults';
import { autoragExperimentsPathname, autoragReconfigurePathname } from '~/app/utilities/routes';
import { isRunTerminatable, isRunRetryable, parseErrorStatus } from '~/app/utilities/utils';

function AutoragResultsPage(): React.JSX.Element {
  const { namespace, runId } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } =
    useNamespaceSelectorWithPersistence();
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const handleDrawerClose = React.useCallback(() => setIsDrawerOpen(false), []);
  const [isStopModalOpen, setIsStopModalOpen] = React.useState(false);
  const { handleRetry, handleConfirmStop, isRetrying, isTerminating } = useAutoragRunActions(
    namespace ?? '',
    runId ?? '',
  );

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const getRedirectPath = (ns: string) => `${autoragExperimentsPathname}/${ns}`;

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

  // Fetch and process AutoRAG results using custom hook
  const {
    patterns,
    isLoading: patternsLoading,
    isError: patternsError,
    error: patternsLoadError,
    ragPatternsBasePath,
  } = useAutoragResults(runId, namespace, pipelineRun);

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
      <Link {...props} to={`${autoragReconfigurePathname}/${namespace}/${runId}`} />
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
        ragPatternsBasePath,
      }),
    [
      pipelineRun,
      patterns,
      pipelineRunPending,
      pipelineRunFetching,
      patternsLoading,
      ragPatternsBasePath,
    ],
  );

  return (
    <>
      <Drawer isExpanded={isDrawerOpen}>
        <DrawerContent
          panelContent={
            <AutoragInputParametersPanel
              onClose={handleDrawerClose}
              parameters={contextValue.parameters}
              isLoading={pipelineRunPending}
            />
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
                    <Link to={getRedirectPath(namespace!)}>AutoRAG: {namespace}</Link>
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
              loadError={patternsLoadError ?? pipelineRunLoadError ?? namespacesLoadError}
              loaded={namespacesLoaded && !pipelineRunPending}
            >
              {!patternsError && (
                <AutoragResultsContext.Provider value={contextValue}>
                  <AutoragResults />
                </AutoragResultsContext.Provider>
              )}
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

export default AutoragResultsPage;

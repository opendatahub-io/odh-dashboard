import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Skeleton,
  Truncate,
} from '@patternfly/react-core';
import { OpenDrawerRightIcon } from '@patternfly/react-icons';
import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { Link, useParams } from 'react-router';
import AutomlHeader from '~/app/components/common/AutomlHeader/AutomlHeader';
import InvalidPipelineRun from '~/app/components/empty-states/InvalidPipelineRun';
import AutomlResults from '~/app/components/run-results/AutomlResults';
import AutomlInputParametersPanel from '~/app/components/run-results/AutomlInputParametersPanel';
import { usePipelineRunQuery } from '~/app/hooks/queries';
import { useAutomlResults } from '~/app/hooks/useAutomlResults';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import { automlExperimentsPathname } from '~/app/utilities/routes';
import { AutomlResultsContext, getAutomlContext } from '~/app/context/AutomlResultsContext';
import { parseErrorStatus } from '~/app/utilities/utils';

function AutomlResultsPage(): React.JSX.Element {
  const { namespace, runId } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } = useNamespaceSelector();
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const handleDrawerClose = React.useCallback(() => setIsDrawerOpen(false), []);

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
              <Button
                variant="link"
                icon={<OpenDrawerRightIcon />}
                onClick={() => setIsDrawerOpen((prev) => !prev)}
                aria-expanded={isDrawerOpen}
                data-testid="run-details-button"
              >
                Run details
              </Button>
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
  );
}

export default AutomlResultsPage;

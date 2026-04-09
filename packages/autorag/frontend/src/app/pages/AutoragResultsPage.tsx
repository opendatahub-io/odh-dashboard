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
import AutoragHeader from '~/app/components/common/AutoragHeader/AutoragHeader';
import InvalidPipelineRun from '~/app/components/empty-states/InvalidPipelineRun';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import AutoragResults from '~/app/components/run-results/AutoragResults';
import AutoragInputParametersPanel from '~/app/components/run-results/AutoragInputParametersPanel';
import { AutoragResultsContext, getAutoragContext } from '~/app/context/AutoragResultsContext';
import { usePipelineRunQuery } from '~/app/hooks/queries';
import { useAutoragResults } from '~/app/hooks/useAutoragResults';
import { autoragExperimentsPathname } from '~/app/utilities/routes';
import { parseErrorStatus } from '~/app/utilities/utils';

function AutoragResultsPage(): React.JSX.Element {
  const { namespace, runId } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } = useNamespaceSelector();
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const handleDrawerClose = React.useCallback(() => setIsDrawerOpen(false), []);

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
  );
}

export default AutoragResultsPage;

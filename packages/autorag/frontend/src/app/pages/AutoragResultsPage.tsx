import { Breadcrumb, BreadcrumbItem, Skeleton } from '@patternfly/react-core';
import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage, ProjectObjectType, TitleWithIcon } from 'mod-arch-shared';
import React from 'react';
import { Link, useParams } from 'react-router';
import InvalidPipelineRun from '~/app/components/empty-states/InvalidPipelineRun';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import AutoragResults from '~/app/components/run-results/AutoragResults';
import { AutoragResultsContext, getAutoragContext } from '~/app/context/AutoragResultsContext';
import { usePipelineRunQuery } from '~/app/hooks/queries';
import { useAutoragResults } from '~/app/hooks/useAutoragResults';
import { autoragExperimentsPathname } from '~/app/utilities/routes';
import { parseErrorStatus } from '~/app/utilities/utils';

function AutoragResultsPage(): React.JSX.Element {
  const { namespace, runId } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } = useNamespaceSelector();

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
  } = useAutoragResults(runId, namespace, pipelineRun);

  const contextValue = React.useMemo(
    () =>
      getAutoragContext({
        pipelineRun,
        patterns,
        pipelineRunLoading: pipelineRunPending || pipelineRunFetching,
        patternsLoading,
      }),
    [pipelineRun, patterns, pipelineRunPending, pipelineRunFetching, patternsLoading],
  );

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="AutoRAG" objectType={ProjectObjectType.pipelineExperiment} />}
      subtext={
        <h2 className="pf-v6-u-mt-sm">
          {pipelineRun ? `"${pipelineRun.display_name}" results` : <Skeleton width="300px" />}
        </h2>
      }
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to={getRedirectPath(namespace!)}>AutoRAG: {namespace}</Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{pipelineRun?.display_name}</BreadcrumbItem>
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
  );
}

export default AutoragResultsPage;

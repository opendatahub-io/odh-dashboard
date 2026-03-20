import { Breadcrumb, BreadcrumbItem, Skeleton } from '@patternfly/react-core';
import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage, ProjectObjectType, TitleWithIcon } from 'mod-arch-shared';
import React from 'react';
import { Link, useParams } from 'react-router';
import InvalidPipelineRun from '~/app/components/empty-states/InvalidPipelineRun';
import AutomlResults from '~/app/components/results/AutomlResults';
import { usePipelineRunQuery } from '~/app/hooks/queries';
import { useAutomlResults } from '~/app/hooks/useAutomlResults';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import { automlExperimentsPathname } from '~/app/utilities/routes';
import { AutomlResultsContext, getAutomlContext } from '~/app/context/AutomlResultsContext';

function AutomlResultsPage(): React.JSX.Element {
  const { namespace, runId } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } = useNamespaceSelector();

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
  const invalidPipelineRunId = pipelineRunError;

  // Fetch and process AutoML results using custom hook
  const { models, isLoading: modelsLoading } = useAutomlResults(runId, namespace, pipelineRun);

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="AutoML" objectType={ProjectObjectType.pipelineExperiment} />}
      subtext={
        <h2 className="pf-v6-u-mt-sm">
          {pipelineRun ? `"${pipelineRun.display_name}" results` : <Skeleton width="300px" />}
        </h2>
      }
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to={getRedirectPath(namespace!)}>AutoML: {namespace}</Link>
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
      loadError={pipelineRunLoadError ?? namespacesLoadError}
      loaded={namespacesLoaded && !pipelineRunPending}
    >
      <AutomlResultsContext.Provider
        value={getAutomlContext({
          pipelineRun,
          models,
          pipelineRunLoading: pipelineRunPending || pipelineRunFetching,
          modelsLoading,
        })}
      >
        <AutomlResults />
      </AutomlResultsContext.Provider>
    </ApplicationsPage>
  );
}

export default AutomlResultsPage;

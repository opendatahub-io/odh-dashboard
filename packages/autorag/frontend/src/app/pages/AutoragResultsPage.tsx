import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage, ProjectObjectType, TitleWithIcon } from 'mod-arch-shared';
import React from 'react';
import { Link, useParams } from 'react-router';
import InvalidPipelineRun from '~/app/components/empty-states/InvalidPipelineRun';
import AutoragResults from '~/app/components/results/AutoragResults';
import { usePipelineRunQuery } from '~/app/hooks/queries';
import InvalidProject from '../components/empty-states/InvalidProject';
import { autoragExperimentsPathname } from '../utilities/routes';

function AutoragResultsPage(): React.JSX.Element {
  const { namespace, runId } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } = useNamespaceSelector();

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const getRedirectPath = (ns: string) => `${autoragExperimentsPathname}/${ns}`;

  const { data: pipelineRun, ...pipelineRunQuery } = usePipelineRunQuery(runId, namespace);
  const invalidPipelineRunId = pipelineRunQuery.isError;

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="AutoRAG" objectType={ProjectObjectType.pipelineExperiment} />}
      subtext={<h2 className="pf-v6-u-mt-sm">{`"${pipelineRun?.display_name}" results`}</h2>}
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
      loadError={pipelineRunQuery.error ?? namespacesLoadError}
      loaded={namespacesLoaded && pipelineRunQuery.isFetched}
    >
      <AutoragResults pipelineRun={pipelineRun} />
    </ApplicationsPage>
  );
}

export default AutoragResultsPage;

import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage, ProjectObjectType, TitleWithIcon } from 'mod-arch-shared';
import React from 'react';
import { useParams } from 'react-router';
import AutoragExperiments from '~/app/components/experiments/AutoragExperiments';
import { usePreferredNamespaceRedirect } from '~/app/hooks/usePreferredNamespaceRedirect';
import ProjectSelectorNavigator from '~/app/components/common/ProjectSelectorNavigator';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import NoProjects from '~/app/components/empty-states/NoProjects';
import { autoragExperimentsPathname } from '~/app/utilities/routes';

function AutoragExperimentsPage(): React.JSX.Element {
  usePreferredNamespaceRedirect();

  const { namespace } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } = useNamespaceSelector();

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const showEmpty = noNamespaces || invalidNamespace;

  const getRedirectPath = (ns: string) => `${autoragExperimentsPathname}/${ns}`;

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="AutoRAG" objectType={ProjectObjectType.pipelineExperiment} />}
      headerContent={
        <ProjectSelectorNavigator
          namespace={namespace}
          getRedirectPath={getRedirectPath}
          showTitle
        />
      }
      description={
        <p>
          Automatically test and tune retrieval, indexing, and model settings to improve
          Retrieval-Augmented Generation (RAG) response quality.
        </p>
      }
      empty={showEmpty}
      emptyStatePage={
        noNamespaces ? (
          <NoProjects />
        ) : (
          <InvalidProject namespace={namespace} getRedirectPath={getRedirectPath} />
        )
      }
      loadError={namespacesLoadError}
      loaded={namespacesLoaded}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <AutoragExperiments />
    </ApplicationsPage>
  );
}

export default AutoragExperimentsPage;

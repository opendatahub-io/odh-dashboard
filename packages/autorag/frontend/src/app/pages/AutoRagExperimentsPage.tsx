import ProjectSelectorNavigator from '@odh-dashboard/internal/concepts/projects/ProjectSelectorNavigator';
import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage, ProjectObjectType, TitleWithIcon } from 'mod-arch-shared';
import React from 'react';
import { useParams } from 'react-router';
import AutoRagExperiments from '~/app/components/experiments/AutoRagExperiments';
import { usePreferredNamespaceRedirect } from '~/app/hooks/usePreferredNamespaceRedirect';
import InvalidProject from '../components/empty-states/InvalidProject';
import NoProjects from '../components/empty-states/NoProjects';
import { autoRagExperimentsPathname } from '../utilities/routes';

function AutoRagExperimentsPage(): React.JSX.Element {
  usePreferredNamespaceRedirect();

  const { namespace } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } = useNamespaceSelector();

  const invalidNamespace = !!namespace && !namespaces.some((ns) => ns.name === namespace);
  const getRedirectPath = (ns: string) => `${autoRagExperimentsPathname}/${ns}`;

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="AutoRAG" objectType={ProjectObjectType.pipelineExperiment} />}
      headerContent={
        <ProjectSelectorNavigator
          namespacesOverride={namespaces}
          showTitle
          getRedirectPath={getRedirectPath}
        />
      }
      description={
        <p>Automatically configure and optimize your Retrieval-Augmented Generation workflows.</p>
      }
      empty={invalidNamespace || (namespacesLoaded && namespaces.length === 0)}
      emptyStatePage={
        invalidNamespace ? (
          <InvalidProject
            namespace={namespace}
            namespaces={namespaces}
            getRedirectPath={getRedirectPath}
          />
        ) : (
          <NoProjects />
        )
      }
      loadError={namespacesLoadError}
      loaded={namespacesLoaded}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <AutoRagExperiments />
    </ApplicationsPage>
  );
}

export default AutoRagExperimentsPage;

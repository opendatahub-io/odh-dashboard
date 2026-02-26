import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage, ProjectObjectType, TitleWithIcon } from 'mod-arch-shared';
import React from 'react';
import { useParams } from 'react-router';
import AutoragExperiments from '~/app/components/experiments/AutoragExperiments';
import { useAutoragMockPipelines } from '~/app/hooks/useAutoragMockPipelines';
import { usePreferredNamespaceRedirect } from '~/app/hooks/usePreferredNamespaceRedirect';
import ProjectSelectorNavigator from '~/app/components/common/ProjectSelectorNavigator';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import NoProjects from '~/app/components/empty-states/NoProjects';
import { autoragExperimentsPathname } from '~/app/utilities/routes';

function AutoragExperimentsPage(): React.JSX.Element {
  usePreferredNamespaceRedirect();

  const { namespace } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } = useNamespaceSelector();
  const [useMock] = useAutoragMockPipelines();

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  // When mock mode is on and no namespaces (e.g. no cluster), still show the table with mock data
  const showEmpty = (noNamespaces && !useMock) || invalidNamespace;

  const getRedirectPath = (ns: string) => `${autoragExperimentsPathname}/${ns}`;

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="Autorag" objectType={ProjectObjectType.pipelineExperiment} />}
      headerContent={
        <ProjectSelectorNavigator
          namespace={namespace}
          getRedirectPath={getRedirectPath}
          showTitle
        />
      }
      description={
        <p>Automatically configure and optimize your Retrieval-Augmented Generation workflows.</p>
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

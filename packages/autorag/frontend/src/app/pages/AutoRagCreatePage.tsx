import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage, ProjectObjectType, TitleWithIcon } from 'mod-arch-shared';
import React from 'react';
import { useParams } from 'react-router';
import InvalidProject from '../components/empty-states/InvalidProject';
import AutoRagCreate from '../components/create/AutoRagCreate';
import { autoRagExperimentsPathname } from '../utilities/routes';

function AutoRagCreatePage(): React.JSX.Element {
  const { namespace } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } = useNamespaceSelector();

  const invalidNamespace = !!namespace && !namespaces.some((ns) => ns.name === namespace);
  const getRedirectPath = (ns: string) => `${autoRagExperimentsPathname}/${ns}`;

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="AutoRAG" objectType={ProjectObjectType.pipelineExperiment} />}
      description={
        <p>Automatically configure and optimize your Retrieval-Augmented Generation workflows.</p>
      }
      empty={invalidNamespace}
      emptyStatePage={
        <InvalidProject
          namespace={namespace}
          namespaces={namespaces}
          getRedirectPath={getRedirectPath}
        />
      }
      loadError={namespacesLoadError}
      loaded={namespacesLoaded}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <AutoRagCreate />
    </ApplicationsPage>
  );
}

export default AutoRagCreatePage;

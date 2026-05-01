import { Button, Flex, FlexItem } from '@patternfly/react-core';
import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { useNavigate, useParams } from 'react-router';
import AutoragHeader from '~/app/components/common/AutoragHeader/AutoragHeader';
import ProjectSelectorNavigator from '~/app/components/common/ProjectSelectorNavigator';
import AutoragExperiments, {
  type AutoragExperimentsListStatus,
} from '~/app/components/experiments/AutoragExperiments';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import NoProjects from '~/app/components/empty-states/NoProjects';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { usePreferredNamespaceRedirect } from '~/app/hooks/usePreferredNamespaceRedirect';
import { autoragConfigurePathname, autoragExperimentsPathname } from '~/app/utilities/routes';

function AutoragExperimentsPage(): React.JSX.Element {
  usePreferredNamespaceRedirect();

  const navigate = useNavigate();
  const { namespace } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } =
    useNamespaceSelectorWithPersistence();

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const showEmpty = noNamespaces || invalidNamespace;

  const getRedirectPath = (ns: string) => `${autoragExperimentsPathname}/${ns}`;

  const [experimentsListStatus, setExperimentsListStatus] =
    React.useState<AutoragExperimentsListStatus>({ loaded: false, hasExperiments: false });

  // When the route namespace changes, drop prior list status so the header cannot briefly reflect
  // the previous project. useLayoutEffect runs before paint and before child useEffect; a passive
  // useEffect here can run after AutoragExperiments has already reported the new namespace and
  // overwrite correct state (header button stuck hidden).

  React.useLayoutEffect(() => {
    setExperimentsListStatus({ loaded: false, hasExperiments: false });
  }, [namespace]);

  const showHeaderCreateRunButton =
    !showEmpty &&
    !!namespace &&
    experimentsListStatus.loaded &&
    experimentsListStatus.hasExperiments;

  const headerContent = (
    <Flex
      justifyContent={{ default: 'justifyContentSpaceBetween' }}
      alignItems={{ default: 'alignItemsCenter' }}
      className="pf-v6-u-w-100"
    >
      <FlexItem>
        <ProjectSelectorNavigator
          namespace={namespace}
          getRedirectPath={getRedirectPath}
          showTitle
        />
      </FlexItem>
      {showHeaderCreateRunButton ? (
        <FlexItem>
          <Button
            variant="primary"
            data-testid="autorag-header-create-run-button"
            onClick={() => {
              if (namespace) {
                navigate(`${autoragConfigurePathname}/${namespace}`);
              }
            }}
          >
            Create AutoRAG optimization run
          </Button>
        </FlexItem>
      ) : null}
    </Flex>
  );

  return (
    <ApplicationsPage
      title={<AutoragHeader />}
      headerContent={headerContent}
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
      <AutoragExperiments onExperimentsListStatus={setExperimentsListStatus} />
    </ApplicationsPage>
  );
}

export default AutoragExperimentsPage;

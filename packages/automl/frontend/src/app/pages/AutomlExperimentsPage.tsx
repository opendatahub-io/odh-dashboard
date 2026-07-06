import { Button, Flex, FlexItem } from '@patternfly/react-core';
import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { useNavigate, useParams } from 'react-router';
import AutomlHeader from '~/app/components/common/AutomlHeader/AutomlHeader';
import ProjectSelectorNavigator from '~/app/components/common/ProjectSelectorNavigator';
import AutomlExperiments, {
  type AutomlExperimentsListStatus,
} from '~/app/components/experiments/AutomlExperiments';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import NoProjects from '~/app/components/empty-states/NoProjects';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { usePreferredNamespaceRedirect } from '~/app/hooks/usePreferredNamespaceRedirect';
import { automlConfigurePathname, automlExperimentsPathname } from '~/app/utilities/routes';

function AutomlExperimentsPage(): React.JSX.Element {
  usePreferredNamespaceRedirect();

  const navigate = useNavigate();
  const { namespace } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } =
    useNamespaceSelectorWithPersistence();

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const showEmpty = noNamespaces || invalidNamespace;

  const getRedirectPath = (ns: string) => `${automlExperimentsPathname}/${ns}`;

  const [experimentsListStatus, setExperimentsListStatus] =
    React.useState<AutomlExperimentsListStatus>({ loaded: false, hasExperiments: false });

  // When the route namespace changes, drop prior list status so the header cannot briefly reflect
  // the previous project. useLayoutEffect runs before paint and before child useEffect; a passive
  // useEffect here can run after AutomlExperiments has already reported the new namespace and
  // overwrite correct state (header button stuck hidden).

  React.useLayoutEffect(() => {
    setExperimentsListStatus({ loaded: false, hasExperiments: false });
  }, [namespace]);

  const showHeaderCreateExperimentButton =
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
      {showHeaderCreateExperimentButton ? (
        <FlexItem>
          <Button
            variant="primary"
            data-testid="automl-header-create-experiment-button"
            onClick={() => {
              if (namespace) {
                navigate(`${automlConfigurePathname}/${namespace}`);
              }
            }}
          >
            Create AutoML optimization run
          </Button>
        </FlexItem>
      ) : null}
    </Flex>
  );

  return (
    <ApplicationsPage
      title={<AutomlHeader />}
      headerContent={headerContent}
      description={<p>Automatically configure and optimize your machine learning workflows.</p>}
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
      <AutomlExperiments onExperimentsListStatus={setExperimentsListStatus} />
    </ApplicationsPage>
  );
}

export default AutomlExperimentsPage;

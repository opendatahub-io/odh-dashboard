import { Button, Flex, FlexItem } from '@patternfly/react-core';
import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage, ProjectObjectType, TitleWithIcon } from 'mod-arch-shared';
import React from 'react';
import { useNavigate, useParams } from 'react-router';
import AutomlExperiments, {
  type AutomlExperimentsListStatus,
} from '~/app/components/experiments/AutomlExperiments';
import { usePreferredNamespaceRedirect } from '~/app/hooks/usePreferredNamespaceRedirect';
import ProjectSelectorNavigator from '~/app/components/common/ProjectSelectorNavigator';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import NoProjects from '~/app/components/empty-states/NoProjects';
import { automlCreatePathname, automlExperimentsPathname } from '~/app/utilities/routes';

function AutomlExperimentsPage(): React.JSX.Element {
  usePreferredNamespaceRedirect();

  const navigate = useNavigate();
  const { namespace } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } = useNamespaceSelector();

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const showEmpty = noNamespaces || invalidNamespace;

  const getRedirectPath = (ns: string) => `${automlExperimentsPathname}/${ns}`;

  const [experimentsListStatus, setExperimentsListStatus] =
    React.useState<AutomlExperimentsListStatus>({ loaded: false, hasExperiments: false });

  // List status comes only from AutomlExperiments; resetting here on namespace ran after the
  // child's notify and could leave the header create action stuck hidden.

  const showHeaderCreateExperimentButton =
    !showEmpty &&
    !!namespace &&
    experimentsListStatus.loaded &&
    experimentsListStatus.hasExperiments;

  const onExperimentsListStatus = React.useCallback((status: AutomlExperimentsListStatus) => {
    setExperimentsListStatus(status);
  }, []);

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
                navigate(`${automlCreatePathname}/${namespace}`);
              }
            }}
          >
            Create AutoML experiment
          </Button>
        </FlexItem>
      ) : null}
    </Flex>
  );

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="AutoML" objectType={ProjectObjectType.pipelineExperiment} />}
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
      <AutomlExperiments onExperimentsListStatus={onExperimentsListStatus} />
    </ApplicationsPage>
  );
}

export default AutomlExperimentsPage;

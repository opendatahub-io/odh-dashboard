import { Button, Flex, FlexItem } from '@patternfly/react-core';
import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage, ProjectObjectType, TitleWithIcon } from 'mod-arch-shared';
import React from 'react';
import { useNavigate, useParams } from 'react-router';
import AutoragExperiments, {
  type AutoragExperimentsListStatus,
} from '~/app/components/experiments/AutoragExperiments';
import { usePreferredNamespaceRedirect } from '~/app/hooks/usePreferredNamespaceRedirect';
import ProjectSelectorNavigator from '~/app/components/common/ProjectSelectorNavigator';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import NoProjects from '~/app/components/empty-states/NoProjects';
import { autoragConfigurePathname, autoragExperimentsPathname } from '~/app/utilities/routes';

function AutoragExperimentsPage(): React.JSX.Element {
  usePreferredNamespaceRedirect();

  const navigate = useNavigate();
  const { namespace } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } = useNamespaceSelector();

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const showEmpty = noNamespaces || invalidNamespace;

  const getRedirectPath = (ns: string) => `${autoragExperimentsPathname}/${ns}`;

  const [experimentsListStatus, setExperimentsListStatus] =
    React.useState<AutoragExperimentsListStatus>({ loaded: false, hasExperiments: false });

  // List status comes only from AutoragExperiments; resetting here on namespace ran after the
  // child's notify and could leave the header create action stuck hidden.

  const showHeaderCreateRunButton =
    !showEmpty &&
    !!namespace &&
    experimentsListStatus.loaded &&
    experimentsListStatus.hasExperiments;

  const onExperimentsListStatus = React.useCallback((status: AutoragExperimentsListStatus) => {
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
            Create RAG optimization run
          </Button>
        </FlexItem>
      ) : null}
    </Flex>
  );

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="AutoRAG" objectType={ProjectObjectType.pipelineExperiment} />}
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
      <AutoragExperiments onExperimentsListStatus={onExperimentsListStatus} />
    </ApplicationsPage>
  );
}

export default AutoragExperimentsPage;

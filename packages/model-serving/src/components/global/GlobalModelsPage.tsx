import React from 'react';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { isDetailTabExtension } from '@odh-dashboard/plugin-core/extension-points';
import { ExtensibleDetailTabs } from '@odh-dashboard/plugin-core/helpers/ui';
import { Bullseye, Spinner, PageSection, Content } from '@patternfly/react-core';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import GlobalDeploymentsView from './GlobalDeploymentsView';
import { ModelDeploymentsProvider } from '../../concepts/ModelDeploymentsContext';
import { getMultiProjectServingPlatforms } from '../../concepts/useProjectServingPlatform';
import { isModelServingPlatformExtension } from '../../../extension-points';

const GLOBAL_DEPLOYMENTS_DETAIL_TAB_GROUP = 'model-serving.global-deployments';
const INTERNAL_MODELS_TAB_ID = 'internal-models';
const EXTERNAL_MODELS_TAB_ID = 'external-models';
const DEPLOYMENTS_BASE_PATH = '/ai-hub/models/deployments';
const DEPLOYMENTS_PAGE_DESCRIPTION =
  'Manage and view the health and performance of your deployed models.';

type GlobalModelsPageContentProps = {
  hidePageDescription?: boolean;
};

const GlobalModelsPageContent: React.FC<GlobalModelsPageContentProps> = ({
  hidePageDescription = false,
}) => {
  const availablePlatforms = useExtensions(isModelServingPlatformExtension);
  const { projects, loaded: projectsLoaded, preferredProject } = React.useContext(ProjectsContext);
  const { namespace } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const projectsToShow = React.useMemo(() => {
    if (preferredProject) {
      return [preferredProject];
    }
    if (namespace) {
      return projects.filter((project) => project.metadata.name === namespace);
    }
    return projects;
  }, [preferredProject, projects, namespace]);

  React.useEffect(() => {
    if (location.pathname.includes(`/${EXTERNAL_MODELS_TAB_ID}`)) {
      return;
    }
    if (!namespace && preferredProject) {
      navigate(`${DEPLOYMENTS_BASE_PATH}/${preferredProject.metadata.name}`, { replace: true });
    }
  }, [location.pathname, namespace, preferredProject, navigate]);

  const BackportPageComponent = React.useMemo(() => {
    const platforms = getMultiProjectServingPlatforms(projectsToShow, availablePlatforms);
    return platforms.find((p) => p.properties.backport?.GlobalModelsPage)?.properties.backport
      ?.GlobalModelsPage;
  }, [projectsToShow, availablePlatforms]);

  if (BackportPageComponent) {
    return (
      <LazyCodeRefComponent
        component={BackportPageComponent}
        fallback={
          <Bullseye>
            <Spinner />
          </Bullseye>
        }
      />
    );
  }

  return (
    <ModelDeploymentsProvider projects={projectsToShow}>
      <GlobalDeploymentsView
        projects={projectsToShow}
        projectsLoaded={projectsLoaded}
        hidePageDescription={hidePageDescription}
      />
    </ModelDeploymentsProvider>
  );
};

const GlobalModelsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { namespace } = useParams();
  const tabExtensions = useExtensions(isDetailTabExtension);

  const deploymentTabExtensions = React.useMemo(
    () =>
      tabExtensions.filter((ext) => ext.properties.group === GLOBAL_DEPLOYMENTS_DETAIL_TAB_GROUP),
    [tabExtensions],
  );

  if (deploymentTabExtensions.length === 0) {
    return <GlobalModelsPageContent />;
  }

  const activeKey = location.pathname.includes(`/${EXTERNAL_MODELS_TAB_ID}`)
    ? EXTERNAL_MODELS_TAB_ID
    : INTERNAL_MODELS_TAB_ID;

  const onSelect = (tabKey: string) => {
    if (tabKey === EXTERNAL_MODELS_TAB_ID) {
      navigate(`${DEPLOYMENTS_BASE_PATH}/${EXTERNAL_MODELS_TAB_ID}`);
      return;
    }
    navigate(namespace ? `${DEPLOYMENTS_BASE_PATH}/${namespace}` : DEPLOYMENTS_BASE_PATH);
  };

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Content component="p" data-testid="app-page-description">
          {DEPLOYMENTS_PAGE_DESCRIPTION}
        </Content>
      </PageSection>
      <ExtensibleDetailTabs
        activeKey={activeKey}
        onSelect={onSelect}
        staticTabs={[
          {
            id: INTERNAL_MODELS_TAB_ID,
            title: 'Internal models',
            content: <GlobalModelsPageContent hidePageDescription />,
          },
        ]}
        extensionTabs={deploymentTabExtensions}
        group={GLOBAL_DEPLOYMENTS_DETAIL_TAB_GROUP}
        ariaLabel="Deployments sub-tabs"
        testId="global-deployments-sub-tabs"
      />
    </>
  );
};

export default GlobalModelsPage;

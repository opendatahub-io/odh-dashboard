import React from 'react';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { isDetailTabExtension } from '@odh-dashboard/plugin-core/extension-points';
import { ExtensibleDetailTabs } from '@odh-dashboard/plugin-core/helpers/ui';
import { Bullseye, Spinner, PageSection, Content } from '@patternfly/react-core';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import GlobalDeploymentsView from './GlobalDeploymentsView';
import {
  DEPLOYMENTS_LEGACY_EXTERNAL_TAB_SEGMENT,
  deploymentsExternalPath,
  deploymentsInternalPath,
  deploymentsLegacyPath,
  getLegacyNamespaceFromPath,
  isExternalDeploymentsPath,
  DEPLOYMENTS_BASE_PATH,
  DEPLOYMENTS_EXTERNAL_SEGMENT,
  DEPLOYMENTS_INTERNAL_SEGMENT,
} from './deploymentsPaths';
import { ModelDeploymentsProvider } from '../../concepts/ModelDeploymentsContext';
import { resolveMultiProjectPlatformOverride } from '../../concepts/resolvePlatformOverride';
import {
  isModelServingPlatformExtension,
  isModelServingPlatformGlobalModelsPage,
} from '../../../extension-points';

/** Keep in sync with MaaS odhExtensions GLOBAL_DEPLOYMENTS_DETAIL_TAB_GROUP. */
export const GLOBAL_DEPLOYMENTS_DETAIL_TAB_GROUP = 'model-serving.global-deployments';
const INTERNAL_MODELS_TAB_ID = 'internal-models';
const EXTERNAL_MODELS_TAB_ID = 'external-models';
const DEPLOYMENTS_PAGE_DESCRIPTION =
  'Manage and view the health and performance of your deployed models.';

type GlobalModelsPageContentProps = {
  hidePageDescription?: boolean;
  hasDeploymentSubTabs?: boolean;
};

const GlobalModelsPageContent: React.FC<GlobalModelsPageContentProps> = ({
  hidePageDescription = false,
  hasDeploymentSubTabs = false,
}) => {
  const availablePlatforms = useExtensions(isModelServingPlatformExtension);
  const globalPageExtensions = useExtensions(isModelServingPlatformGlobalModelsPage);
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
    if (hasDeploymentSubTabs && isExternalDeploymentsPath(location.pathname)) {
      return;
    }
    if (!namespace && preferredProject) {
      navigate(
        hasDeploymentSubTabs
          ? deploymentsInternalPath(preferredProject.metadata.name)
          : deploymentsLegacyPath(preferredProject.metadata.name),
        { replace: true },
      );
    }
  }, [hasDeploymentSubTabs, location.pathname, namespace, preferredProject, navigate]);

  const globalPageOverride = React.useMemo(
    () =>
      resolveMultiProjectPlatformOverride(projectsToShow, availablePlatforms, globalPageExtensions),
    [projectsToShow, availablePlatforms, globalPageExtensions],
  );

  if (globalPageOverride) {
    return (
      <LazyCodeRefComponent
        component={globalPageOverride.properties.component}
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
        useSubTabPaths={hasDeploymentSubTabs}
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

  const hasDeploymentSubTabs = deploymentTabExtensions.length > 0;

  React.useEffect(() => {
    if (hasDeploymentSubTabs) {
      const legacyNamespace = getLegacyNamespaceFromPath(location.pathname);
      if (legacyNamespace) {
        navigate(deploymentsInternalPath(legacyNamespace), { replace: true });
        return;
      }

      if (location.pathname.includes(`/${DEPLOYMENTS_LEGACY_EXTERNAL_TAB_SEGMENT}`)) {
        navigate(deploymentsExternalPath(namespace), { replace: true });
      }
      return;
    }

    const subTabInternalMatch = location.pathname.match(
      new RegExp(`^${DEPLOYMENTS_BASE_PATH}/${DEPLOYMENTS_INTERNAL_SEGMENT}(?:/([^/]+))?$`),
    );
    if (subTabInternalMatch) {
      navigate(deploymentsLegacyPath(subTabInternalMatch[1]), { replace: true });
      return;
    }

    const subTabExternalMatch = location.pathname.match(
      new RegExp(`^${DEPLOYMENTS_BASE_PATH}/${DEPLOYMENTS_EXTERNAL_SEGMENT}(?:/([^/]+))?$`),
    );
    if (subTabExternalMatch) {
      navigate(deploymentsLegacyPath(subTabExternalMatch[1]), { replace: true });
    }
  }, [hasDeploymentSubTabs, location.pathname, namespace, navigate]);

  const onSelect = React.useCallback(
    (tabKey: string) => {
      if (tabKey === EXTERNAL_MODELS_TAB_ID) {
        navigate(deploymentsExternalPath(namespace));
        return;
      }
      navigate(deploymentsInternalPath(namespace));
    },
    [namespace, navigate],
  );

  if (!hasDeploymentSubTabs) {
    return <GlobalModelsPageContent />;
  }

  const activeKey = isExternalDeploymentsPath(location.pathname)
    ? EXTERNAL_MODELS_TAB_ID
    : INTERNAL_MODELS_TAB_ID;

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
        isSubtab
        mountOnEnter
        unmountOnExit
        tabContentIsFilled={false}
        staticTabs={[
          {
            id: INTERNAL_MODELS_TAB_ID,
            title: 'Internal models',
            content: <GlobalModelsPageContent hidePageDescription hasDeploymentSubTabs />,
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

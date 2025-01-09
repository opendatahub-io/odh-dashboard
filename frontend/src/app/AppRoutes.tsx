import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { InvalidArgoDeploymentAlert } from '~/concepts/pipelines/content/InvalidArgoDeploymentAlert';
import ApplicationsPage from '~/pages/ApplicationsPage';
import UnauthorizedError from '~/pages/UnauthorizedError';
import { useUser } from '~/redux/selectors';
import {
  globArtifactsAll,
  globExecutionsAll,
  globExperimentsAll,
  globPipelineRunsAll,
  globPipelinesAll,
} from '~/routes';
import { useCheckJupyterEnabled } from '~/utilities/notebookControllerUtils';
import { SupportedArea } from '~/concepts/areas';
import useIsAreaAvailable from '~/concepts/areas/useIsAreaAvailable';
import ModelRegistrySettingsRoutes from '~/pages/modelRegistrySettings/ModelRegistrySettingsRoutes';
import ConnectionTypeRoutes from '~/pages/connectionTypes/ConnectionTypeRoutes';
import ComingSoonPage from '~/pages/ComingSoonPage';
import { ProjectObjectType } from '~/concepts/design/utils';
import GlobalNotebooksPage from '~/pages/notebooks/GlobalNotebooksPage';
import ProjectDetailsContextProvider from '~/pages/projects/ProjectDetailsContext';
import GlobalClusterStoragePage from '~/pages/clusterStorage/GlobalClusterStoragePage';
import GlobalConnectionsPage from '~/pages/connections/GlobalConnectionsPage';
import Applications from '~/pages/applications/Applications';
import GeneralSettings from '~/pages/clusterSettings/GeneralSettings';
import ModelServingPlatforms from '~/pages/modelSetup/ModelServingPlatforms';

const HomePage = React.lazy(() => import('../pages/home/Home'));

const InstalledApplications = React.lazy(
  () => import('../pages/enabledApplications/EnabledApplications'),
);
const ExploreApplications = React.lazy(
  () => import('../pages/exploreApplication/ExploreApplications'),
);
const NotebookLogoutRedirectPage = React.lazy(
  () => import('../pages/notebookController/NotebookLogoutRedirect'),
);
const ProjectViewRoutes = React.lazy(() => import('../pages/projects/ProjectViewRoutes'));
const ModelServingRoutes = React.lazy(() => import('../pages/modelServing/ModelServingRoutes'));
const NotebookController = React.lazy(
  () => import('../pages/notebookController/NotebookController'),
);

const GlobalPipelinesRoutes = React.lazy(() => import('../pages/pipelines/GlobalPipelinesRoutes'));
const GlobalPipelineRunsRoutes = React.lazy(
  () => import('../pages/pipelines/GlobalPipelineRunsRoutes'),
);
const GlobalPipelineExperimentRoutes = React.lazy(
  () => import('../pages/pipelines/GlobalPipelineExperimentsRoutes'),
);
const GlobalPipelineExecutionsRoutes = React.lazy(
  () => import('../pages/pipelines/GlobalPipelineExecutionsRoutes'),
);

const GlobalArtifactsRoutes = React.lazy(() => import('../pages/pipelines/GlobalArtifactsRoutes'));

const GlobalDistributedWorkloadsRoutes = React.lazy(
  () => import('../pages/distributedWorkloads/GlobalDistributedWorkloadsRoutes'),
);

const ClusterSettingsPage = React.lazy(() => import('../pages/clusterSettings/ClusterSettings'));
const CustomServingRuntimeRoutes = React.lazy(
  () => import('../pages/modelServing/customServingRuntimes/CustomServingRuntimeRoutes'),
);
const EnvironmentSetupPage = React.lazy(() => import('../pages/environmentSetup/EnvironmentSetup'));
const ModelSetupPage = React.lazy(() => import('../pages/modelSetup/ModelSetup'));

const GroupSettingsPage = React.lazy(() => import('../pages/groupSettings/GroupSettings'));
const LearningCenterPage = React.lazy(() => import('../pages/learningCenter/LearningCenter'));
const BYONImageRoutes = React.lazy(() => import('../pages/BYONImages/BYONImageRoutes'));
const BYONImagesPage = React.lazy(() => import('../pages/BYONImages/BYONImages'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

const DependencyMissingPage = React.lazy(
  () => import('../pages/dependencies/DependencyMissingPage'),
);

const AcceleratorProfileRoutes = React.lazy(
  () => import('../pages/acceleratorProfiles/AcceleratorProfilesRoutes'),
);

const HardwareProfileRoutes = React.lazy(
  () => import('../pages/hardwareProfiles/HardwareProfilesRoutes'),
);

const StorageClassesPage = React.lazy(() => import('../pages/storageClasses/StorageClassesPage'));

const ModelCatalogRoutes = React.lazy(() => import('../pages/modelCatalog/ModelCatalogRoutes'));

const ModelRegistryRoutes = React.lazy(() => import('../pages/modelRegistry/ModelRegistryRoutes'));

const ExternalRoutes = React.lazy(() => import('../pages/external/ExternalRoutes'));

const AppRoutes: React.FC = () => {
  const { isAdmin, isAllowed } = useUser();
  const isJupyterEnabled = useCheckJupyterEnabled();
  const isHomeAvailable = useIsAreaAvailable(SupportedArea.HOME).status;

  if (!isAllowed) {
    return (
      <Routes>
        <Route path="*" element={<UnauthorizedError />} />
      </Routes>
    );
  }

  return (
    <React.Suspense fallback={<ApplicationsPage title="" description="" loaded={false} empty />}>
      <InvalidArgoDeploymentAlert />
      <Routes>
        <Route path="/external/*" element={<ExternalRoutes />} />
        {isHomeAvailable ? (
          <>
            <Route path="/" element={<HomePage />} />
            <Route path="/enabled" element={<InstalledApplications />} />
          </>
        ) : (
          <Route path="/" element={<InstalledApplications />} />
        )}
        <Route path="/explore" element={<ExploreApplications />} />
        <Route path="/resources" element={<LearningCenterPage />} />
        <Route
          path="/modelCustomization"
          element={
            <ComingSoonPage title="Model customization" objectType={ProjectObjectType.modelSetup} />
          }
        />

        <Route path="/projects/*" element={<ProjectViewRoutes />} />

        {isJupyterEnabled && (
          <Route path="/notebookController/*" element={<NotebookController />} />
        )}

        <Route
          path="/notebook/:namespace/:notebookName/logout"
          element={<NotebookLogoutRedirectPage />}
        />

        <Route path="/modelServing/*" element={<ModelServingRoutes />} />

        <Route path="/modelCatalog/*" element={<ModelCatalogRoutes />} />

        <Route path="/modelRegistry" element={<ModelRegistryRoutes />} />
        <Route path="/modelRegistry/*" element={<ModelRegistryRoutes />} />

        <Route path={globPipelinesAll} element={<GlobalPipelinesRoutes />} />
        <Route path={globPipelineRunsAll} element={<GlobalPipelineRunsRoutes />} />
        <Route path={globExperimentsAll} element={<GlobalPipelineExperimentRoutes />} />
        <Route path={globArtifactsAll} element={<GlobalArtifactsRoutes />} />
        <Route path={globExecutionsAll} element={<GlobalPipelineExecutionsRoutes />} />

        <Route path="/distributedWorkloads/*" element={<GlobalDistributedWorkloadsRoutes />} />

        <Route path="/dependency-missing/:area" element={<DependencyMissingPage />} />

        {isAdmin && (
          <>
            <Route path="/notebookImages" element={<BYONImageRoutes />} />
            <Route path="/clusterSettings" element={<ClusterSettingsPage />}>
              <Route path="general" element={<GeneralSettings />} />
              <Route path="storage-classes" element={<StorageClassesPage />} />
            </Route>
            <Route path="/environmentSetup" element={<EnvironmentSetupPage />}>
              <Route path="workbench-images" element={<BYONImagesPage />} />
              <Route path="hardware-profiles" element={<AcceleratorProfileRoutes />} />
              <Route path="connection-types" element={<ConnectionTypeRoutes />} />
            </Route>
            <Route path="/modelSetup" element={<ModelSetupPage />}>
              <Route path="model-serving-platforms" element={<ModelServingPlatforms />} />
              <Route path="serving-runtimes" element={<CustomServingRuntimeRoutes />} />
              <Route
                path="model-registry-settings"
                element={
                  <ComingSoonPage
                    title="Model registry settings"
                    objectType={ProjectObjectType.modelRegistrySettings}
                  />
                }
              />
            </Route>

            <Route path="/acceleratorProfiles/*" element={<AcceleratorProfileRoutes />} />
            <Route path="/hardwareProfiles/*" element={<HardwareProfileRoutes />} />
            <Route path="/servingRuntimes/*" element={<CustomServingRuntimeRoutes />} />
            <Route path="/connectionTypes/*" element={<ConnectionTypeRoutes />} />
            <Route path="/storageClasses/*" element={<StorageClassesPage />} />
            <Route path="/modelRegistrySettings/*" element={<ModelRegistrySettingsRoutes />} />
            <Route path="/groupSettings" element={<GroupSettingsPage />} />
          </>
        )}
        <Route
          path="/workbenches/:namespace?"
          element={
            <ProjectDetailsContextProvider
              getInvalidRedirectPath={(ns) => `/workbenches/${ns}`}
              allowAllProjects
            />
          }
        >
          <Route index element={<GlobalNotebooksPage />} />
        </Route>
        <Route
          path="/clusterStorage/:namespace?"
          element={
            <ProjectDetailsContextProvider
              getInvalidRedirectPath={(ns) => `/clusterStorage/${ns}`}
              allowAllProjects
            />
          }
        >
          <Route index element={<GlobalClusterStoragePage />} />
        </Route>
        <Route
          path="/connections/:namespace?"
          element={
            <ProjectDetailsContextProvider
              getInvalidRedirectPath={(ns) => `/connections/${ns}`}
              allowAllProjects
            />
          }
        >
          <Route index element={<GlobalConnectionsPage />} />
        </Route>
        <Route path="/applications/:tab?" element={<Applications />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </React.Suspense>
  );
};

export default AppRoutes;

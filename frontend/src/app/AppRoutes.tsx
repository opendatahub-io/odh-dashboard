import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { InvalidArgoDeploymentAlert } from '~/concepts/pipelines/content/InvalidArgoDeploymentAlert';
import ApplicationsPage from '~/pages/ApplicationsPage';
import UnauthorizedError from '~/pages/UnauthorizedError';
import { useUser } from '~/redux/selectors';
import { globArtifactsAll } from '~/routes/pipelines/artifacts';
import { globExecutionsAll } from '~/routes/pipelines/executions';
import { globExperimentsAll } from '~/routes/pipelines/experiments';
import { globModelCustomizationAll } from '~/routes/pipelines/modelCustomization';
import { globPipelineRunsAll } from '~/routes/pipelines/runs';
import { globPipelinesAll } from '~/routes/pipelines/global';
import { useCheckJupyterEnabled } from '~/utilities/notebookControllerUtils';
import { SupportedArea } from '~/concepts/areas';
import useIsAreaAvailable from '~/concepts/areas/useIsAreaAvailable';
import ModelRegistrySettingsRoutes from '~/pages/modelRegistrySettings/ModelRegistrySettingsRoutes';
import ConnectionTypeRoutes from '~/pages/connectionTypes/ConnectionTypeRoutes';

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
const GlobalModelCustomizationRoutes = React.lazy(
  () => import('../pages/pipelines/GlobalModelCustomizationRoutes'),
);

const GlobalArtifactsRoutes = React.lazy(() => import('../pages/pipelines/GlobalArtifactsRoutes'));

const GlobalDistributedWorkloadsRoutes = React.lazy(
  () => import('../pages/distributedWorkloads/GlobalDistributedWorkloadsRoutes'),
);

const ClusterSettingsPage = React.lazy(() => import('../pages/clusterSettings/ClusterSettings'));
const CustomServingRuntimeRoutes = React.lazy(
  () => import('../pages/modelServing/customServingRuntimes/CustomServingRuntimeRoutes'),
);
const GroupSettingsPage = React.lazy(() => import('../pages/groupSettings/GroupSettings'));
const LearningCenterPage = React.lazy(() => import('../pages/learningCenter/LearningCenter'));
const BYONImageRoutes = React.lazy(() => import('../pages/BYONImages/BYONImageRoutes'));
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
  const isFineTuningAvailable = useIsAreaAvailable(SupportedArea.FINE_TUNING).status;

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

        <Route path="/modelRegistry/*" element={<ModelRegistryRoutes />} />

        <Route path={globPipelinesAll} element={<GlobalPipelinesRoutes />} />
        <Route path={globPipelineRunsAll} element={<GlobalPipelineRunsRoutes />} />
        <Route path={globExperimentsAll} element={<GlobalPipelineExperimentRoutes />} />
        <Route path={globArtifactsAll} element={<GlobalArtifactsRoutes />} />
        <Route path={globExecutionsAll} element={<GlobalPipelineExecutionsRoutes />} />
        {isFineTuningAvailable && (
          <Route path={globModelCustomizationAll} element={<GlobalModelCustomizationRoutes />} />
        )}

        <Route path="/distributedWorkloads/*" element={<GlobalDistributedWorkloadsRoutes />} />

        <Route path="/dependency-missing/:area" element={<DependencyMissingPage />} />

        {isAdmin && (
          <>
            <Route path="/workbenchImages/*" element={<BYONImageRoutes />} />
            <Route path="/clusterSettings" element={<ClusterSettingsPage />} />
            <Route path="/acceleratorProfiles/*" element={<AcceleratorProfileRoutes />} />
            <Route path="/servingRuntimes/*" element={<CustomServingRuntimeRoutes />} />
            <Route path="/connectionTypes/*" element={<ConnectionTypeRoutes />} />
            <Route path="/storageClasses/*" element={<StorageClassesPage />} />
            <Route path="/modelRegistrySettings/*" element={<ModelRegistrySettingsRoutes />} />
            <Route path="/groupSettings" element={<GroupSettingsPage />} />
          </>
        )}
        <Route path="/hardwareProfiles/*" element={<HardwareProfileRoutes />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </React.Suspense>
  );
};

export default AppRoutes;

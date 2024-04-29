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
const GroupSettingsPage = React.lazy(() => import('../pages/groupSettings/GroupSettings'));
const LearningCenterPage = React.lazy(() => import('../pages/learningCenter/LearningCenter'));
const BYONImagesPage = React.lazy(() => import('../pages/BYONImages/BYONImages'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

const DependencyMissingPage = React.lazy(
  () => import('../pages/dependencies/DependencyMissingPage'),
);

const AcceleratorProfileRoutes = React.lazy(
  () => import('../pages/acceleratorProfiles/AcceleratorProfilesRoutes'),
);

const ModelRegistryRoutes = React.lazy(() => import('../pages/modelRegistry/ModelRegistryRoutes'));

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
            <Route path="/notebookImages" element={<BYONImagesPage />} />
            <Route path="/clusterSettings" element={<ClusterSettingsPage />} />
            <Route path="/acceleratorProfiles/*" element={<AcceleratorProfileRoutes />} />
            <Route path="/servingRuntimes/*" element={<CustomServingRuntimeRoutes />} />
            <Route path="/groupSettings" element={<GroupSettingsPage />} />
          </>
        )}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </React.Suspense>
  );
};

export default AppRoutes;

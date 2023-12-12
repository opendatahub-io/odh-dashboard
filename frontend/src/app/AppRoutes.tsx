import React from 'react';
import { Route, Routes } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import UnauthorizedError from '~/pages/UnauthorizedError';
import { useUser } from '~/redux/selectors';

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
const EdgeModelsRoutes = React.lazy(() => import('../pages/edge/EdgeModelRoutes'));
const EdgePipelinesRoutes = React.lazy(() => import('../pages/edge/EdgePipelinesRoutes'));
const GlobalPipelinesRoutes = React.lazy(() => import('../pages/pipelines/GlobalPipelinesRoutes'));
const GlobalPipelineRunsRoutes = React.lazy(
  () => import('../pages/pipelines/GlobalPipelineRunsRoutes'),
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

const AppRoutes: React.FC = () => {
  const { isAdmin, isAllowed } = useUser();

  if (!isAllowed) {
    return (
      <Routes>
        <Route path="*" element={<UnauthorizedError />} />
      </Routes>
    );
  }

  return (
    <React.Suspense
      fallback={<ApplicationsPage title="" description="" loaded={false} empty={true} />}
    >
      <Routes>
        <Route path="/" element={<InstalledApplications />} />
        <Route path="/explore" element={<ExploreApplications />} />
        <Route path="/resources" element={<LearningCenterPage />} />

        <Route path="/projects/*" element={<ProjectViewRoutes />} />

        <Route path="/notebookController/*" element={<NotebookController />} />
        <Route
          path="/notebook/:namespace/:notebookName/logout"
          element={<NotebookLogoutRedirectPage />}
        />

        <Route path="/modelServing/*" element={<ModelServingRoutes />} />

        <Route path="/pipelines/*" element={<GlobalPipelinesRoutes />} />
        <Route path="/pipelineRuns/*" element={<GlobalPipelineRunsRoutes />} />

        <Route path="/dependency-missing/:area" element={<DependencyMissingPage />} />

        {isAdmin && (
          <>
            <Route path="/notebookImages" element={<BYONImagesPage />} />
            <Route path="/clusterSettings" element={<ClusterSettingsPage />} />
            <Route path="/servingRuntimes/*" element={<CustomServingRuntimeRoutes />} />
            <Route path="/groupSettings" element={<GroupSettingsPage />} />
          </>
        )}
        <Route path="/edgeModels/*" element={<EdgeModelsRoutes />} />
        <Route path="/edgePipelines/*" element={<EdgePipelinesRoutes />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </React.Suspense>
  );
};

export default AppRoutes;

import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectModelMetricsWrapper from '~/pages/modelServing/screens/projects/ProjectModelMetricsWrapper';
import ProjectServerMetricsWrapper from '~/pages/modelServing/screens/projects/ProjectServerMetricsWrapper';
import useModelMetricsEnabled from '~/pages/modelServing/useModelMetricsEnabled';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import ProjectModelMetricsConfigurationPage from '~/pages/modelServing/screens/projects/ProjectModelMetricsConfigurationPage';
import ProjectModelMetricsPage from '~/pages/modelServing/screens/projects/ProjectModelMetricsPage';
import ProjectInferenceExplainabilityWrapper from '~/pages/modelServing/screens/projects/ProjectInferenceExplainabilityWrapper';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import ModelServingPlatform from '~/pages/modelServing/screens/projects/ModelServingPlatform';
import ModelRegistrySettingsRoutes from '~/pages/modelRegistrySettings/ModelRegistrySettingsRoutes';
import StorageList from '~/pages/projects/screens/detail/storage/StorageList';
import ProjectSharing from '~/pages/projects/projectSharing/ProjectSharing';
import ConnectionsList from '~/pages/projects/screens/detail/connections/ConnectionsList';
import PipelinesSection from '~/pages/projects/screens/detail/pipelines/PipelinesSection';
import ComingSoonPage from '~/pages/ComingSoonPage';
import GlobalDistributedWorkloads from '~/pages/distributedWorkloads/global/GlobalDistributedWorkloads';
import ProjectDetails from './screens/detail/ProjectDetails';
import ProjectView from './screens/projects/ProjectView';
import NotebookList from './screens/detail/notebooks/NotebookList';
import ProjectDetailsContextProvider from './ProjectDetailsContext';
import SpawnerPage from './screens/spawner/SpawnerPage';
import EditSpawnerPage from './screens/spawner/EditSpawnerPage';

const ExperimentRoutes = React.lazy(
  () => import('~/pages/pipelines/GlobalPipelineExperimentsRoutes'),
);

const ExecutionsRoutes = React.lazy(
  () => import('~/pages/pipelines/GlobalPipelineExecutionsRoutes'),
);

const ArtifactsRoutes = React.lazy(() => import('~/pages/pipelines/GlobalArtifactsRoutes'));

const ProjectViewRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  const performanceMetricsAreaAvailable = useIsAreaAvailable(
    SupportedArea.PERFORMANCE_METRICS,
  ).status;

  return (
    <ProjectsRoutes>
      <Route path="/" element={<ProjectView />} />
      <Route path="/:namespace/*" element={<ProjectDetailsContextProvider />}>
        <Route index element={<ProjectDetails />} />
        <Route path="spawner" element={<SpawnerPage />} />
        <Route path="spawner/:notebookName" element={<EditSpawnerPage />} />
        {modelMetricsEnabled && (
          <>
            <Route path="metrics/model" element={<ProjectInferenceExplainabilityWrapper />}>
              <Route index element={<Navigate to=".." />} />
              <Route path=":inferenceService" element={<ProjectModelMetricsWrapper />}>
                <Route path=":tab?" element={<ProjectModelMetricsPage />} />
                {biasMetricsAreaAvailable && (
                  <Route path="configure" element={<ProjectModelMetricsConfigurationPage />} />
                )}
              </Route>
              <Route path="*" element={<Navigate to="." />} />
            </Route>
            {performanceMetricsAreaAvailable && (
              <Route
                path="metrics/server/:servingRuntime"
                element={<ProjectServerMetricsWrapper />}
              />
            )}
          </>
        )}
        <Route path="workbenches" element={<NotebookList />} />
        <Route path="experiments" element={<ExperimentRoutes />} />
        <Route path="executions" element={<ExecutionsRoutes />} />
        <Route path="artifacts" element={<ArtifactsRoutes />} />
        <Route
          path="training"
          element={<ComingSoonPage title="Training" namespaced path="training" />}
        />
        <Route
          path="tuning"
          element={<ComingSoonPage title="Training" namespaced path="tuning" />}
        />
        <Route path="pipelines" element={<PipelinesSection />} />
        <Route path="modelRegistry" element={<ModelRegistrySettingsRoutes />} />
        <Route path="deployedModels" element={<ModelServingPlatform />} />
        <Route path="connections" element={<ConnectionsList />} />
        <Route path="clusterStorage" element={<StorageList />} />
        <Route
          path="monitorResources"
          element={
            <ComingSoonPage title="Resource monitoring" namespaced path="monitorResources" />
          }
        />
        <Route path="projectPermissions" element={<ProjectSharing />} />
        <Route path="distributedWorkloads" element={<GlobalDistributedWorkloads />} />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
      <Route path="*" element={<Navigate to="." />} />
    </ProjectsRoutes>
  );
};

export default ProjectViewRoutes;

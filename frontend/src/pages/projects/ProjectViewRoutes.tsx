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
import ProjectExperimentRuns from '~/pages/projects/screens/detail/experiments/ProjectExperimentRuns';
import ProjectExperiments from '~/pages/projects/screens/detail/experiments/ProjectExperiments';
import ProjectOverview from '~/pages/projects/screens/detail/overview/ProjectOverview';
import NotebookList from '~/pages/projects/screens/detail/notebooks/NotebookList';
import ExperimentContextProvider from '~/pages/pipelines/global/experiments/ExperimentContext';
import PipelineAvailabilityLoader from '~/pages/pipelines/global/pipelines/PipelineAvailabilityLoader';
import PipelinesSection from '~/pages/projects/screens/detail/pipelines/PipelinesSection';
import ModelServingPlatform from '~/pages/modelServing/screens/projects/ModelServingPlatform';
import ProjectSharing from '~/pages/projects/projectSharing/ProjectSharing';
import StorageList from '~/pages/projects/screens/detail/storage/StorageList';
import ConnectionsList from '~/pages/projects/screens/detail/connections/ConnectionsList';
import ExecutionsSection from '~/pages/projects/screens/detail/executions/ExecutionsSection';
import ArtifactsSection from '~/pages/projects/screens/detail/artifacts/ArtifactsSection';
import DistributedWorkloadsSection from '~/pages/projects/screens/detail/distributedWorkloads/DistributedWorkloadsSection';
import EditSpawnerPage from './screens/spawner/EditSpawnerPage';
import SpawnerPage from './screens/spawner/SpawnerPage';
import ProjectDetailsContextProvider from './ProjectDetailsContext';
import ProjectView from './screens/projects/ProjectView';
import ProjectDetails from './screens/detail/ProjectDetails';

const ProjectViewRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  const performanceMetricsAreaAvailable = useIsAreaAvailable(
    SupportedArea.PERFORMANCE_METRICS,
  ).status;

  return (
    <ProjectsRoutes>
      <Route path="/" element={<ProjectView />} />
      <Route path="/:namespace" element={<ProjectDetailsContextProvider />}>
        <Route element={<ProjectDetails />}>
          <Route index element={<ProjectOverview />} />
          <Route path="overview" element={<ProjectOverview />} />
          <Route path="workbenches" element={<NotebookList />} />
          <Route path="experiments-and-runs" element={<PipelineAvailabilityLoader />}>
            <Route index element={<ProjectExperiments />} />
            <Route path=":tab?">
              <Route index element={<ProjectExperiments />} />
              <Route path=":experimentId" element={<ExperimentContextProvider />}>
                <Route index element={<ProjectExperimentRuns />} />
                <Route path=":runTab" element={<ProjectExperimentRuns />} />
              </Route>
            </Route>
          </Route>
          <Route path="executions" element={<ExecutionsSection />} />
          <Route path="artifacts" element={<ArtifactsSection />} />
          <Route path="distributed-workloads" element={<DistributedWorkloadsSection />} />
          <Route path="model-deployments" element={<ModelServingPlatform />} />
          <Route path="pipelines" element={<PipelinesSection />} />
          <Route path="connections" element={<ConnectionsList />} />
          <Route path="cluster-storages" element={<StorageList />} />
          <Route path="permissions" element={<ProjectSharing />} />
        </Route>
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
        <Route path="*" element={<Navigate to="." />} />
      </Route>
      <Route path="*" element={<Navigate to="." />} />
    </ProjectsRoutes>
  );
};

export default ProjectViewRoutes;

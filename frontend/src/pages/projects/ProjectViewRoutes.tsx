import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectModelMetricsWrapper from '~/pages/modelServing/screens/projects/ProjectModelMetricsWrapper';
import ProjectServerMetricsWrapper from '~/pages/modelServing/screens/projects/ProjectServerMetricsWrapper';
import useModelMetricsEnabled from '~/pages/modelServing/useModelMetricsEnabled';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import ProjectPipelineBreadcrumbPage from '~/pages/projects/screens/detail/pipelines/ProjectPipelineBreadcrumbPage';
import PipelineDetails from '~/concepts/pipelines/content/pipelinesDetails/pipeline/PipelineDetails';
import PipelineRunDetails from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDetails';
import CreateRunPage from '~/concepts/pipelines/content/createRun/CreateRunPage';
import CloneRunPage from '~/concepts/pipelines/content/createRun/CloneRunPage';
import ProjectModelMetricsConfigurationPage from '~/pages/modelServing/screens/projects/ProjectModelMetricsConfigurationPage';
import ProjectModelMetricsPage from '~/pages/modelServing/screens/projects/ProjectModelMetricsPage';
import useBiasMetricsEnabled from '~/concepts/explainability/useBiasMetricsEnabled';
import usePerformanceMetricsEnabled from '~/pages/modelServing/screens/metrics/usePerformanceMetricsEnabled';
import ProjectInferenceExplainabilityWrapper from '~/pages/modelServing/screens/projects/ProjectInferenceExplainabilityWrapper';
import ProjectDetails from './screens/detail/ProjectDetails';
import ProjectView from './screens/projects/ProjectView';
import ProjectDetailsContextProvider from './ProjectDetailsContext';
import SpawnerPage from './screens/spawner/SpawnerPage';
import EditSpawnerPage from './screens/spawner/EditSpawnerPage';

const ProjectViewRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();
  const [biasMetricsEnabled] = useBiasMetricsEnabled();
  const [performanceMetricsEnabled] = usePerformanceMetricsEnabled();

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
                {biasMetricsEnabled && (
                  <Route path="configure" element={<ProjectModelMetricsConfigurationPage />} />
                )}
              </Route>
              <Route path="*" element={<Navigate to="." />} />
            </Route>
            {performanceMetricsEnabled && (
              <Route
                path="metrics/server/:servingRuntime"
                element={<ProjectServerMetricsWrapper />}
              />
            )}
          </>
        )}
        <Route
          path="pipeline/view/:pipelineId"
          element={<ProjectPipelineBreadcrumbPage BreadcrumbDetailsComponent={PipelineDetails} />}
        />
        <Route
          path="pipelineRun/view/:pipelineRunId"
          element={
            <ProjectPipelineBreadcrumbPage BreadcrumbDetailsComponent={PipelineRunDetails} />
          }
        />
        <Route
          path="pipelineRun/create"
          element={<ProjectPipelineBreadcrumbPage BreadcrumbDetailsComponent={CreateRunPage} />}
        />
        <Route
          path="pipelineRun/clone/:pipelineRunId"
          element={<ProjectPipelineBreadcrumbPage BreadcrumbDetailsComponent={CloneRunPage} />}
        />

        <Route path="*" element={<Navigate to="." />} />
      </Route>
      <Route path="*" element={<Navigate to="." />} />
    </ProjectsRoutes>
  );
};

export default ProjectViewRoutes;

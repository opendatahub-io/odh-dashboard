import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectInferenceMetricsWrapper from '~/pages/modelServing/screens/projects/ProjectInferenceMetricsWrapper';
import ProjectRuntimeMetricsWrapper from '~/pages/modelServing/screens/projects/ProjectRuntimeMetricsWrapper';
import useModelMetricsEnabled from '~/pages/modelServing/useModelMetricsEnabled';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import ProjectPipelineBreadcrumbPage from '~/pages/projects/screens/detail/pipelines/ProjectPipelineBreadcrumbPage';
import PipelineDetails from '~/concepts/pipelines/content/pipelinesDetails/pipeline/PipelineDetails';
import PipelineRunDetails from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDetails';
import CreateRunPage from '~/concepts/pipelines/content/createRun/CreateRunPage';
import CloneRunPage from '~/concepts/pipelines/content/createRun/CloneRunPage';
import { ExplainabilityProvider } from '~/concepts/explainability/ExplainabilityContext';
import ProjectInferenceMetricsConfigurationPage from '~/pages/modelServing/screens/projects/ProjectInferenceMetricsConfigurationPage';
import ProjectInferenceMetricsPage from '~/pages/modelServing/screens/projects/ProjectInferenceMetricsPage';
import ProjectDetails from './screens/detail/ProjectDetails';
import ProjectView from './screens/projects/ProjectView';
import ProjectDetailsContextProvider from './ProjectDetailsContext';
import SpawnerPage from './screens/spawner/SpawnerPage';
import EditSpawnerPage from './screens/spawner/EditSpawnerPage';

const ProjectViewRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();

  return (
    <ProjectsRoutes>
      <Route path="/" element={<ProjectView />} />
      <Route path="/:namespace/*" element={<ProjectDetailsContextProvider />}>
        <Route index element={<ProjectDetails />} />
        <Route path="spawner" element={<SpawnerPage />} />
        <Route path="spawner/:notebookName" element={<EditSpawnerPage />} />
        {modelMetricsEnabled && (
          <>
            <Route path="metrics/model" element={<ExplainabilityProvider />}>
              <Route index element={<Navigate to=".." />} />
              <Route path=":inferenceService" element={<ProjectInferenceMetricsWrapper />}>
                <Route path=":tab?" element={<ProjectInferenceMetricsPage />} />
                <Route path="configure" element={<ProjectInferenceMetricsConfigurationPage />} />
              </Route>
              <Route path="*" element={<Navigate to="." />} />
            </Route>
            <Route path="metrics/runtime" element={<ProjectRuntimeMetricsWrapper />} />
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

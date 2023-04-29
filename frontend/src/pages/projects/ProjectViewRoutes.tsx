import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import DetailsPageMetricsWrapper from '~/pages/modelServing/screens/projects/DetailsPageMetricsWrapper';
import useModelMetricsEnabled from '~/pages/modelServing/useModelMetricsEnabled';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import ProjectPipelineDetails from '~/pages/projects/screens/detail/pipelines/ProjectPipelineDetails';
import PipelineDetails from '~/concepts/pipelines/content/pipelinesDetails/pipeline/PipelineDetails';
import PipelineRunDetails from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDetails';
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
        <Route
          path="metrics/model/:inferenceService"
          element={
            modelMetricsEnabled ? <DetailsPageMetricsWrapper /> : <Navigate replace to="/" />
          }
        />
        <Route
          path="pipeline/:pipelineId"
          element={<ProjectPipelineDetails BreadcrumbDetailsComponent={PipelineDetails} />}
        />
        <Route
          path="pipelineRun/:pipelineRunId"
          element={<ProjectPipelineDetails BreadcrumbDetailsComponent={PipelineRunDetails} />}
        />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
      <Route path="*" element={<Navigate to="." />} />
    </ProjectsRoutes>
  );
};

export default ProjectViewRoutes;

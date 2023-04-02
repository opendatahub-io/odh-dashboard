import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import GlobalPipelineCoreLoader from '~/pages/pipelines/global/GlobalPipelineCoreLoader';
import {
  pipelinesPageDescription,
  pipelinesPageTitle,
} from '~/pages/pipelines/global/pipelines/const';
import GlobalPipelineDetails from '~/pages/pipelines/global/pipelines/GlobalPipelineDetails';
import GlobalPipelines from './global/pipelines/GlobalPipelines';

const GlobalPipelinesRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path="/:namespace?/*"
      element={
        <GlobalPipelineCoreLoader
          title={pipelinesPageTitle}
          description={pipelinesPageDescription}
          getInvalidRedirectPath={(namespace) => `/pipelines/${namespace}`}
        />
      }
    >
      <Route index element={<GlobalPipelines />} />
      <Route path=":pipelineId" element={<GlobalPipelineDetails />} />
    </Route>

    <Route path="*" element={<Navigate to="." />} />
  </ProjectsRoutes>
);

export default GlobalPipelinesRoutes;

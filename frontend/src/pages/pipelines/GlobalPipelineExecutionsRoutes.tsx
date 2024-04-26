import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import GlobalPipelineCoreLoader from '~/pages/pipelines/global/GlobalPipelineCoreLoader';
import { executionsBaseRoute } from '~/routes';
import {
  executionsPageDescription,
  executionsPageTitle,
} from '~/pages/pipelines/global/experiments/executions/const';
import GlobalExecutions from '~/pages/pipelines/global/experiments/executions/GlobalExecutions';

const GlobalPipelineExecutionsRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path="/:namespace?/*"
      element={
        <GlobalPipelineCoreLoader
          title={executionsPageTitle}
          description={executionsPageDescription}
          getInvalidRedirectPath={executionsBaseRoute}
        />
      }
    >
      <Route index element={<GlobalExecutions />} />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </ProjectsRoutes>
);

export default GlobalPipelineExecutionsRoutes;

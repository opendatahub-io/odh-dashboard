import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '#~/concepts/projects/ProjectsRoutes';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import GlobalPipelineCoreLoader from '#~/pages/pipelines/global/GlobalPipelineCoreLoader';
import { executionsBaseRoute } from '#~/routes/pipelines/executions';
import {
  executionsPageDescription,
  executionsPageTitle,
} from '#~/pages/pipelines/global/experiments/executions/const';
import GlobalExecutions from '#~/pages/pipelines/global/experiments/executions/GlobalExecutions';
import ExecutionDetails from '#~/pages/pipelines/global/experiments/executions/details/ExecutionDetails';
import GlobalPipelineCoreDetails from '#~/pages/pipelines/global/GlobalPipelineCoreDetails';

const GlobalPipelineExecutionsRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path="/:namespace?/*"
      element={
        <GlobalPipelineCoreLoader
          title={
            <TitleWithIcon
              title={executionsPageTitle}
              objectType={ProjectObjectType.pipelineExecution}
            />
          }
          description={executionsPageDescription}
          getInvalidRedirectPath={executionsBaseRoute}
        />
      }
    >
      <Route index element={<GlobalExecutions />} />
      <Route
        path=":executionId"
        element={
          <GlobalPipelineCoreDetails
            BreadcrumbDetailsComponent={ExecutionDetails}
            pageName="Executions"
            redirectPath={executionsBaseRoute}
          />
        }
      />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </ProjectsRoutes>
);

export default GlobalPipelineExecutionsRoutes;

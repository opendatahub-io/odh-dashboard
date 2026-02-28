import * as React from 'react';
import { Route } from 'react-router-dom';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import ProjectsRoutes from '@odh-dashboard/internal/concepts/projects/ProjectsRoutes';
import TitleWithIcon from '@odh-dashboard/internal/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import { mlflowPromptManagementBaseRoute } from '@odh-dashboard/internal/routes/pipelines/mlflow';
import MlflowPromptManagementPage from './MlflowPromptManagementPage';
import {
  PROMPT_MANAGEMENT_PAGE_TITLE,
  PROMPT_MANAGEMENT_NO_PROJECTS_MESSAGE,
} from '../shared/constants';
import WorkspaceRouteLoader from '../shared/WorkspaceRouteLoader';

const GlobalMLflowPromptManagementRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path="/*"
      element={
        <WorkspaceRouteLoader
          title={
            <TitleWithIcon
              title={PROMPT_MANAGEMENT_PAGE_TITLE}
              objectType={ProjectObjectType.pipelineExperiment}
            />
          }
          getRedirectPath={mlflowPromptManagementBaseRoute}
          noProjectsMessage={PROMPT_MANAGEMENT_NO_PROJECTS_MESSAGE}
          noProjectsTestId="prompt-management-no-projects-empty-state"
          PageComponent={MlflowPromptManagementPage}
        />
      }
    />
    <Route path="*" element={<NotFound />} />
  </ProjectsRoutes>
);

export default GlobalMLflowPromptManagementRoutes;

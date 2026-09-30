import * as React from 'react';
import { Route } from 'react-router-dom';
import ProjectsRoutes from '@odh-dashboard/ui-core/components/ProjectsRoutes';
import TitleWithIcon from '@odh-dashboard/ui-core/design/TitleWithIcon';
import { ProjectObjectType } from '@odh-dashboard/ui-core';
import { agentObservabilityBaseRoute } from '@odh-dashboard/internal/routes/pipelines/mlflow';
import MlflowAgentObservabilityPage from './MlflowAgentObservabilityPage';
import {
  AGENT_OBSERVABILITY_PAGE_TITLE,
  AGENT_OBSERVABILITY_NO_PROJECTS_MESSAGE,
} from '../shared/const';
import WorkspaceRouteLoader from '../shared/WorkspaceRouteLoader';

const GlobalMLflowAgentObservabilityRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path="/*"
      element={
        <WorkspaceRouteLoader
          title={
            <TitleWithIcon
              title={AGENT_OBSERVABILITY_PAGE_TITLE}
              objectType={ProjectObjectType.mlflow}
            />
          }
          getRedirectPath={agentObservabilityBaseRoute}
          noProjectsMessage={AGENT_OBSERVABILITY_NO_PROJECTS_MESSAGE}
          noProjectsTestId="agent-observability-no-projects-empty-state"
          PageComponent={MlflowAgentObservabilityPage}
        />
      }
    />
  </ProjectsRoutes>
);

export default GlobalMLflowAgentObservabilityRoutes;

/**
 * MLflow experiments route handler.
 *
 * Validates the workspace query param, redirects to preferred project
 * if none is selected, and shows empty state if no projects exist.
 * Adapted from the old GlobalMLflowExperimentsRoutes.tsx (iframe version).
 */
import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import ProjectsRoutes from '@odh-dashboard/internal/concepts/projects/ProjectsRoutes';
import TitleWithIcon from '@odh-dashboard/internal/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import { mlflowExperimentsBaseRoute } from '@odh-dashboard/internal/routes/pipelines/mlflow';
import MlflowExperimentsPage from './MlflowExperimentsPage';
import { EXPERIMENTS_PAGE_TITLE, EXPERIMENTS_NO_PROJECTS_MESSAGE } from '../shared/constants';
import WorkspaceRouteLoader from '../shared/WorkspaceRouteLoader';

const GlobalMLflowExperimentsRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path="/experiments/*"
      element={
        <WorkspaceRouteLoader
          title={
            <TitleWithIcon
              title={EXPERIMENTS_PAGE_TITLE}
              objectType={ProjectObjectType.pipelineExperiment}
            />
          }
          getRedirectPath={mlflowExperimentsBaseRoute}
          noProjectsMessage={EXPERIMENTS_NO_PROJECTS_MESSAGE}
          noProjectsTestId="mlflow-no-projects-empty-state"
          PageComponent={MlflowExperimentsPage}
        />
      }
    />
    <Route path="/" element={<Navigate to="experiments" replace />} />
    <Route path="*" element={<NotFound />} />
  </ProjectsRoutes>
);

export default GlobalMLflowExperimentsRoutes;

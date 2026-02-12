/**
 * MLflow experiments route handler.
 *
 * Validates the workspace query param, redirects to preferred project
 * if none is selected, and shows empty state if no projects exist.
 * Adapted from the old GlobalMLflowExperimentsRoutes.tsx (iframe version).
 */
import * as React from 'react';
import { Navigate, Route, useSearchParams, useNavigate } from 'react-router-dom';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import { WrenchIcon } from '@patternfly/react-icons/dist/esm/icons/wrench-icon';
import ProjectsRoutes from '@odh-dashboard/internal/concepts/projects/ProjectsRoutes';
import { byName, ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import InvalidProject from '@odh-dashboard/internal/concepts/projects/InvalidProject';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import PipelineCoreProjectSelector from '@odh-dashboard/internal/pages/pipelines/global/PipelineCoreProjectSelector';
import TitleWithIcon from '@odh-dashboard/internal/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import NewProjectButton from '@odh-dashboard/internal/pages/projects/screens/projects/NewProjectButton';
import MlflowExperimentsPage from './MlflowExperimentsPage';
import { mlflowExperimentsBaseRoute, WORKSPACE_QUERY_PARAM } from './routes';

const experimentsPageTitle = 'Experiments';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type EmptyStateProps = 'emptyStatePage' | 'empty';
type ApplicationPageRenderState = Pick<ApplicationPageProps, EmptyStateProps>;

const MLflowNoProjects: React.FC = () => {
  const navigate = useNavigate();
  return (
    <EmptyState
      headingLevel="h4"
      icon={WrenchIcon}
      titleText="No projects"
      data-testid="mlflow-no-projects-empty-state"
    >
      <EmptyStateBody>To view MLflow experiments, first create a project.</EmptyStateBody>
      <EmptyStateFooter>
        <NewProjectButton
          closeOnCreate
          onProjectCreated={(projectName) => navigate(mlflowExperimentsBaseRoute(projectName))}
        />
      </EmptyStateFooter>
    </EmptyState>
  );
};

const GlobalMLflowWorkspaceLoader: React.FC = () => {
  const [searchParams] = useSearchParams();
  const namespace = searchParams.get(WORKSPACE_QUERY_PARAM);
  const { projects, preferredProject } = React.useContext(ProjectsContext);

  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };

  if (projects.length === 0) {
    renderStateProps = {
      empty: true,
      emptyStatePage: <MLflowNoProjects />,
    };
  } else if (!namespace) {
    const redirectProject = preferredProject || projects[0];
    return <Navigate to={mlflowExperimentsBaseRoute(redirectProject.metadata.name)} replace />;
  } else {
    const foundProject = projects.find(byName(namespace));
    if (foundProject) {
      return <MlflowExperimentsPage />;
    }
    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <InvalidProject namespace={namespace} getRedirectPath={mlflowExperimentsBaseRoute} />
      ),
    };
  }

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon
          title={experimentsPageTitle}
          objectType={ProjectObjectType.pipelineExperiment}
        />
      }
      {...renderStateProps}
      loaded
      headerContent={
        <PipelineCoreProjectSelector
          getRedirectPath={mlflowExperimentsBaseRoute}
          queryParamNamespace={WORKSPACE_QUERY_PARAM}
        />
      }
      provideChildrenPadding
    />
  );
};

const GlobalMLflowExperimentsRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route path="/experiments/*" element={<GlobalMLflowWorkspaceLoader />} />
    <Route path="/" element={<Navigate to="experiments" replace />} />
    <Route path="*" element={<NotFound />} />
  </ProjectsRoutes>
);

export default GlobalMLflowExperimentsRoutes;

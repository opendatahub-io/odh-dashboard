import * as React from 'react';
import { Navigate, Outlet, Route, useParams } from 'react-router-dom';
import ProjectsRoutes from '#~/concepts/projects/ProjectsRoutes';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import InvalidProject from '#~/concepts/projects/InvalidProject';
import PipelineCoreProjectSelector from '#~/pages/pipelines/global/PipelineCoreProjectSelector';
import { mlflowExperimentsBaseRoute } from '#~/routes/pipelines/mlflowExperiments';
import GlobalMLflowExperimentsPage from '#~/pages/pipelines/global/mlflowExperiments/MLFlowExperimentsPage';
import MLflowNoProjects from '#~/pages/pipelines/global/mlflowExperiments/MLflowNoProjects';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type EmptyStateProps = 'emptyStatePage' | 'empty';
type ApplicationPageRenderState = Pick<ApplicationPageProps, EmptyStateProps>;

const GlobalMLflowWorkspaceLoader: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const { projects } = React.useContext(ProjectsContext);
  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
  if (projects.length === 0) {
    renderStateProps = {
      empty: true,
      emptyStatePage: <MLflowNoProjects />,
    };
  } else if (namespace) {
    const foundProject = projects.find(byName(namespace));
    if (foundProject) {
      return <Outlet />;
    }
    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <InvalidProject namespace={namespace} getRedirectPath={mlflowExperimentsBaseRoute} />
      ),
    };
  } else {
    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <InvalidProject namespace={namespace} getRedirectPath={mlflowExperimentsBaseRoute} />
      ),
    };
  }

  return (
    <ApplicationsPage
      title="MLflow Experiments"
      {...renderStateProps}
      loaded
      headerContent={<PipelineCoreProjectSelector getRedirectPath={mlflowExperimentsBaseRoute} />}
      provideChildrenPadding
    />
  );
};

const GlobalMLflowRootLoader: React.FC = () => {
  const { projects, preferredProject } = React.useContext(ProjectsContext);
  if (projects.length === 0) {
    return (
      <ApplicationsPage
        title="MLflow Experiments"
        empty
        emptyStatePage={<MLflowNoProjects />}
        loaded
        provideChildrenPadding
      />
    );
  }
  const redirectProject = preferredProject || projects[0];
  return <Navigate to={mlflowExperimentsBaseRoute(redirectProject.metadata.name)} replace />;
};

const GlobalMLflowExperimentsRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route path="/workspaces/:namespace/*" element={<GlobalMLflowWorkspaceLoader />}>
      <Route path="*" element={<GlobalMLflowExperimentsPage />} />
    </Route>
    <Route path="/" element={<GlobalMLflowRootLoader />} />
    <Route path="*" element={<GlobalMLflowRootLoader />} />
  </ProjectsRoutes>
);

export default GlobalMLflowExperimentsRoutes;

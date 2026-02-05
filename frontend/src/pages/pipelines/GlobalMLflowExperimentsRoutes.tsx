import * as React from 'react';
import { Navigate, Route, useSearchParams } from 'react-router-dom';
import ProjectsRoutes from '#~/concepts/projects/ProjectsRoutes';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import InvalidProject from '#~/concepts/projects/InvalidProject';
import PipelineCoreProjectSelector from '#~/pages/pipelines/global/PipelineCoreProjectSelector';
import {
  mlflowExperimentsBaseRoute,
  WORKSPACE_QUERY_PARAM,
} from '#~/routes/pipelines/mlflowExperiments';
import GlobalMLflowExperimentsPage from '#~/pages/pipelines/global/mlflowExperiments/MLFlowExperimentsPage';
import MLflowNoProjects from '#~/pages/pipelines/global/mlflowExperiments/MLflowNoProjects';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type EmptyStateProps = 'emptyStatePage' | 'empty';
type ApplicationPageRenderState = Pick<ApplicationPageProps, EmptyStateProps>;

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
      return <GlobalMLflowExperimentsPage />;
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
      title="MLflow Experiments"
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
    <Route path="/*" element={<GlobalMLflowWorkspaceLoader />} />
  </ProjectsRoutes>
);

export default GlobalMLflowExperimentsRoutes;

import * as React from 'react';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons/dist/esm/icons/wrench-icon';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { byName, ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import InvalidProject from '@odh-dashboard/internal/concepts/projects/InvalidProject';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import PipelineCoreProjectSelector from '@odh-dashboard/internal/pages/pipelines/global/PipelineCoreProjectSelector';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import NewProjectButton from '@odh-dashboard/internal/pages/projects/screens/projects/NewProjectButton';
import { WORKSPACE_QUERY_PARAM } from '@odh-dashboard/internal/routes/pipelines/mlflow';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type ApplicationPageRenderState = Pick<ApplicationPageProps, 'emptyStatePage' | 'empty'>;

interface WorkspaceRouteLoaderProps {
  title: React.ReactNode;
  getRedirectPath: (namespace: string) => string;
  noProjectsMessage: string;
  noProjectsTestId: string;
  PageComponent: React.ComponentType;
}

const NoProjectsEmptyState: React.FC<{
  message: string;
  testId: string;
  getRedirectPath: (namespace: string) => string;
}> = ({ message, testId, getRedirectPath }) => {
  const navigate = useNavigate();
  return (
    <EmptyState headingLevel="h4" icon={WrenchIcon} titleText="No projects" data-testid={testId}>
      <EmptyStateBody>{message}</EmptyStateBody>
      <EmptyStateFooter>
        <NewProjectButton
          closeOnCreate
          onProjectCreated={(projectName) => navigate(getRedirectPath(projectName))}
        />
      </EmptyStateFooter>
    </EmptyState>
  );
};

const WorkspaceRouteLoader: React.FC<WorkspaceRouteLoaderProps> = ({
  title,
  getRedirectPath,
  noProjectsMessage,
  noProjectsTestId,
  PageComponent,
}) => {
  const [searchParams] = useSearchParams();
  const namespace = searchParams.get(WORKSPACE_QUERY_PARAM);
  const { projects, preferredProject } = React.useContext(ProjectsContext);

  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };

  if (projects.length === 0) {
    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <NoProjectsEmptyState
          message={noProjectsMessage}
          testId={noProjectsTestId}
          getRedirectPath={getRedirectPath}
        />
      ),
    };
  } else if (!namespace) {
    const redirectProject = preferredProject || projects[0];
    return <Navigate to={getRedirectPath(redirectProject.metadata.name)} replace />;
  } else {
    const foundProject = projects.find(byName(namespace));
    if (foundProject) {
      return <PageComponent />;
    }
    renderStateProps = {
      empty: true,
      emptyStatePage: <InvalidProject namespace={namespace} getRedirectPath={getRedirectPath} />,
    };
  }

  return (
    <ApplicationsPage
      title={title}
      {...renderStateProps}
      loaded
      headerContent={
        <PipelineCoreProjectSelector
          getRedirectPath={getRedirectPath}
          queryParamNamespace={WORKSPACE_QUERY_PARAM}
        />
      }
      provideChildrenPadding
    />
  );
};

export default WorkspaceRouteLoader;

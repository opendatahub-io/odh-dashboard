import * as React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { byName } from '@odh-dashboard/k8s-core';
import InvalidProject from '@odh-dashboard/ui-core/components/InvalidProject';
import { getStoredPreferredProject } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import PipelineCoreProjectSelector from '@odh-dashboard/internal/pages/pipelines/global/PipelineCoreProjectSelector';
import { WORKSPACE_QUERY_PARAM } from '@odh-dashboard/internal/routes/pipelines/mlflow';
import NoProjectsEmptyState from './NoProjectsEmptyState';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type ApplicationPageRenderState = Pick<ApplicationPageProps, 'emptyStatePage' | 'empty'>;

interface WorkspaceRouteLoaderProps {
  title: React.ReactNode;
  getRedirectPath: (namespace: string) => string;
  noProjectsMessage: string;
  noProjectsTestId: string;
  PageComponent: React.ComponentType;
}

const WorkspaceRouteLoader: React.FC<WorkspaceRouteLoaderProps> = ({
  title,
  getRedirectPath,
  noProjectsMessage,
  noProjectsTestId,
  PageComponent,
}) => {
  const [searchParams] = useSearchParams();
  const namespace = searchParams.get(WORKSPACE_QUERY_PARAM);
  const { projects, preferredProject, loaded } = React.useContext(ProjectsContext);
  const storedProject = getStoredPreferredProject(projects);

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
    const redirectProject = storedProject ?? preferredProject ?? projects[0];
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
      loaded={loaded}
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

import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import PipelineCoreNoProjects from '#~/pages/pipelines/global/PipelineCoreNoProjects';
import { PipelineContextProvider } from '#~/concepts/pipelines/context';
import InvalidProject from '#~/concepts/projects/InvalidProject';
import PipelineCoreProjectSelector from './PipelineCoreProjectSelector';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type EmptyStateProps = 'emptyStatePage' | 'empty';

type GlobalPipelineCoreLoaderProps = {
  strict?: boolean;
  getInvalidRedirectPath: (namespace: string) => string;
} & Omit<
  ApplicationPageProps,
  'loaded' | 'headerContent' | 'provideChildrenPadding' | EmptyStateProps
>;

type ApplicationPageRenderState = Pick<ApplicationPageProps, EmptyStateProps>;

const GlobalPipelineCoreLoader: React.FC<GlobalPipelineCoreLoaderProps> = ({
  strict = false,
  getInvalidRedirectPath,
  ...applicationPageProps
}) => {
  const { namespace } = useParams<{ namespace: string }>();
  const { projects, preferredProject } = React.useContext(ProjectsContext);

  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
  if (projects.length === 0) {
    renderStateProps = {
      empty: true,
      emptyStatePage: <PipelineCoreNoProjects />,
    };
  } else if (namespace) {
    const foundProject = projects.find(byName(namespace));
    if (foundProject) {
      // Render the content
      return (
        <PipelineContextProvider namespace={namespace}>
          <Outlet />
        </PipelineContextProvider>
      );
    }

    // They ended up on a non-valid project path
    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <InvalidProject namespace={namespace} getRedirectPath={getInvalidRedirectPath} />
      ),
    };
  } else {
    const redirectProject = preferredProject ?? projects[0];
    if (!strict) {
      // Redirect the namespace suffix into the URL
      return <Navigate to={getInvalidRedirectPath(redirectProject.metadata.name)} replace />;
    }
    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <InvalidProject namespace={namespace} getRedirectPath={getInvalidRedirectPath} />
      ),
    };
  }

  return (
    <ApplicationsPage
      {...applicationPageProps}
      {...renderStateProps}
      loaded
      headerContent={
        !strict && <PipelineCoreProjectSelector getRedirectPath={getInvalidRedirectPath} />
      }
      provideChildrenPadding
    />
  );
};
export default GlobalPipelineCoreLoader;

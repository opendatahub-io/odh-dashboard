import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import PipelineCoreNoProjects from '~/pages/pipelines/global/PipelineCoreNoProjects';
import PipelineCoreProjectSelector from '~/pages/pipelines/global/PipelineCoreProjectSelector';
import { PipelineContextProvider } from '~/concepts/pipelines/context';
import InvalidProject from '~/concepts/projects/InvalidProject';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type EmptyStateProps = 'emptyStatePage' | 'empty';

type GlobalPipelineCoreLoaderProps = {
  page: string;
  getInvalidRedirectPath: (namespace: string) => string;
} & Omit<
  ApplicationPageProps,
  'loaded' | 'headerContent' | 'provideChildrenPadding' | EmptyStateProps
>;

type ApplicationPageRenderState = Pick<ApplicationPageProps, EmptyStateProps>;

const GlobalPipelineCoreLoader: React.FC<GlobalPipelineCoreLoaderProps> = ({
  page,
  getInvalidRedirectPath,
  ...applicationPageProps
}) => {
  const { namespace } = useParams<{ namespace: string }>();
  const { projects, getPreferredProject } = React.useContext(ProjectsContext);
  const preferredProject = getPreferredProject(page);

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
        <InvalidProject
          page="pipelines"
          namespace={namespace}
          getRedirectPath={getInvalidRedirectPath}
        />
      ),
    };
  } else {
    // Redirect the namespace suffix into the URL
    const redirectProject = preferredProject ?? projects[0];
    return <Navigate to={getInvalidRedirectPath(redirectProject.metadata.name)} replace />;
  }

  return (
    <ApplicationsPage
      {...applicationPageProps}
      {...renderStateProps}
      loaded
      headerContent={
        <PipelineCoreProjectSelector page={page} getRedirectPath={getInvalidRedirectPath} />
      }
      provideChildrenPadding
    />
  );
};
export default GlobalPipelineCoreLoader;

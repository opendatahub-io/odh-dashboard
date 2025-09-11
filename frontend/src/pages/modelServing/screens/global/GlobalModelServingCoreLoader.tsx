import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import InvalidProject from '#~/concepts/projects/InvalidProject';
import ModelServingContextProvider from '#~/pages/modelServing/ModelServingContext';
import ModelServingNoProjects from '#~/pages/modelServing/screens/global/ModelServingNoProjects';
import ModelServingProjectSelection from '#~/pages/modelServing/screens/global/ModelServingProjectSelection';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type EmptyStateProps = 'emptyStatePage' | 'empty';

type GlobalModelServingCoreLoaderProps = {
  getInvalidRedirectPath: (namespace: string) => string;
};

type ApplicationPageRenderState = Pick<ApplicationPageProps, EmptyStateProps>;

const GlobalModelServingCoreLoader: React.FC<GlobalModelServingCoreLoaderProps> = ({
  getInvalidRedirectPath,
}) => {
  const { namespace } = useParams<{ namespace: string }>();
  const { projects, preferredProject } = React.useContext(ProjectsContext);

  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
  if (projects.length === 0) {
    renderStateProps = {
      empty: true,
      emptyStatePage: <ModelServingNoProjects />,
    };
  } else if (namespace) {
    const foundProject = projects.find(byName(namespace));
    if (foundProject) {
      // Render the content
      return (
        <ModelServingContextProvider namespace={namespace}>
          <Outlet />
        </ModelServingContextProvider>
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
    // Redirect the namespace suffix into the URL
    if (preferredProject) {
      return <Navigate to={getInvalidRedirectPath(preferredProject.metadata.name)} replace />;
    }
    // Go with All projects path
    return (
      <ModelServingContextProvider>
        <Outlet />
      </ModelServingContextProvider>
    );
  }

  return (
    <ApplicationsPage
      {...renderStateProps}
      title="Deployments"
      description="Manage and view the health and performance of your deployed models."
      loaded
      headerContent={<ModelServingProjectSelection getRedirectPath={getInvalidRedirectPath} />}
      provideChildrenPadding
    />
  );
};
export default GlobalModelServingCoreLoader;

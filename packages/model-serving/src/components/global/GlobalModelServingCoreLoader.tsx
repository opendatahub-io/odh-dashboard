import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { byName } from '@odh-dashboard/k8s-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import InvalidProject from '@odh-dashboard/internal/concepts/projects/InvalidProject';
import ModelServingContextProvider from '@odh-dashboard/internal/pages/modelServing/ModelServingContext';
import ModelServingNoProjects from '@odh-dashboard/internal/pages/modelServing/screens/global/ModelServingNoProjects';
import { getStoredPreferredProject } from '@odh-dashboard/internal/concepts/projects/getStoredPreferredProject';
import ModelServingProjectSelection from './ModelServingProjectSelection';

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
  const storedProject = getStoredPreferredProject(projects);

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
    const effectiveProject = storedProject ?? preferredProject;
    if (effectiveProject) {
      return <Navigate to={getInvalidRedirectPath(effectiveProject.metadata.name)} replace />;
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

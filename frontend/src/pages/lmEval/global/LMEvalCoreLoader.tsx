import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import InvalidProject from '#~/concepts/projects/InvalidProject';
import LMEvalNoProjects from '#~/pages/lmEval/components/LMEvalNoProjects';
import LMEvalProjectSelector from '#~/pages/lmEval/components/LMEvalProjectSelector';
import { LMEvalContextProvider } from './LMEvalContext';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type EmptyStateProps = 'emptyStatePage' | 'empty';

type LMEvalCoreLoaderProps = {
  getInvalidRedirectPath: (namespace: string) => string;
};

type ApplicationPageRenderState = Pick<ApplicationPageProps, EmptyStateProps>;

const LMEvalCoreLoader: React.FC<LMEvalCoreLoaderProps> = ({ getInvalidRedirectPath }) => {
  const { namespace } = useParams<{ namespace: string }>();
  const { projects, preferredProject } = React.useContext(ProjectsContext);

  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
  if (projects.length === 0) {
    renderStateProps = {
      empty: true,
      emptyStatePage: <LMEvalNoProjects />,
    };
  } else if (namespace) {
    const foundProject = projects.find(byName(namespace));
    if (foundProject) {
      // Render the content
      return (
        <LMEvalContextProvider namespace={namespace}>
          <Outlet />
        </LMEvalContextProvider>
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
      <LMEvalContextProvider>
        <Outlet />
      </LMEvalContextProvider>
    );
  }

  return (
    <ApplicationsPage
      {...renderStateProps}
      title="Model deployments"
      description="Manage and view the health and performance of your deployed models."
      loaded
      headerContent={<LMEvalProjectSelector getRedirectPath={getInvalidRedirectPath} />}
      provideChildrenPadding
    />
  );
};
export default LMEvalCoreLoader;

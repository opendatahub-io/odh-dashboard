import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { byName, ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import InvalidProject from '@odh-dashboard/internal/concepts/projects/InvalidProject';
import { ModelTrainingContextProvider } from './ModelTrainingContext';
import ModelTrainingNoProjects from '../components/ModelTrainingNoProjects';
import ModelTrainingProjectSelector from '../components/ModelTrainingProjectSelector';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type EmptyStateProps = 'emptyStatePage' | 'empty';

type ModelTrainingCoreLoaderProps = {
  getInvalidRedirectPath: (namespace: string) => string;
};

type ApplicationPageRenderState = Pick<ApplicationPageProps, EmptyStateProps>;

const ModelTrainingCoreLoader: React.FC<ModelTrainingCoreLoaderProps> = ({
  getInvalidRedirectPath,
}) => {
  const { namespace } = useParams<{ namespace: string }>();
  const { projects, preferredProject } = React.useContext(ProjectsContext);

  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
  if (projects.length === 0) {
    renderStateProps = {
      empty: true,
      emptyStatePage: <ModelTrainingNoProjects />,
    };
  } else if (namespace) {
    const foundProject = projects.find(byName(namespace));
    if (foundProject) {
      // Render the content
      return (
        <ModelTrainingContextProvider namespace={namespace}>
          <Outlet />
        </ModelTrainingContextProvider>
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
      <ModelTrainingContextProvider>
        <Outlet />
      </ModelTrainingContextProvider>
    );
  }

  return (
    <ApplicationsPage
      {...renderStateProps}
      title="Model training"
      description="Select a project to view its PyTorch training jobs. Monitor training progress and manage distributed training workloads across your data science projects."
      loaded
      headerContent={<ModelTrainingProjectSelector getRedirectPath={getInvalidRedirectPath} />}
      provideChildrenPadding
    />
  );
};

export default ModelTrainingCoreLoader;

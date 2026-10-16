import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { useWorkingProject } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { byName } from '@odh-dashboard/k8s-core';
import InvalidProject from '@odh-dashboard/ui-core/components/InvalidProject';
import { getStoredPreferredProject } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { useUser } from '@odh-dashboard/internal/redux/selectors/user';
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
  const { activeProject } = useWorkingProject();
  const { isAdmin } = useUser();
  const isUnifiedProjectSelectorEnabled = useIsAreaAvailable(
    SupportedArea.UNIFIED_PROJECT_SELECTOR,
  ).status;
  const storedProject = getStoredPreferredProject(projects);

  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
  if (projects.length === 0) {
    renderStateProps = {
      empty: true,
      emptyStatePage: <ModelTrainingNoProjects />,
    };
  } else if (
    isUnifiedProjectSelectorEnabled &&
    isAdmin &&
    namespace &&
    activeProject &&
    namespace !== activeProject.name
  ) {
    return <Navigate to={getInvalidRedirectPath(activeProject.name)} replace />;
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
    const effectiveProject =
      isUnifiedProjectSelectorEnabled && isAdmin
        ? null
        : storedProject ??
          preferredProject ??
          (isUnifiedProjectSelectorEnabled
            ? projects.find(byName(activeProject?.name)) ?? null
            : null);
    if (effectiveProject) {
      return <Navigate to={getInvalidRedirectPath(effectiveProject.metadata.name)} replace />;
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
      title="Training jobs"
      description="Select a project to view its PyTorch training jobs. Monitor training progress and manage distributed training workloads across your data science projects."
      loaded
      headerContent={<ModelTrainingProjectSelector getRedirectPath={getInvalidRedirectPath} />}
      provideChildrenPadding
    />
  );
};

export default ModelTrainingCoreLoader;

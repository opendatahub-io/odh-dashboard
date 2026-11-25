import * as React from 'react';
import { Navigate, Outlet, useParams, useSearchParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import {
  useWorkingProject,
  WorkingProjectStatusValue,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import InvalidProject from '@odh-dashboard/ui-core/components/InvalidProject';
import { getStoredPreferredProject } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useWorkingProjectRouteSync } from '@odh-dashboard/plugin-core/routing';
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
  const [searchParams] = useSearchParams();
  const allProjectsRequested = searchParams.get('allProjects') === 'true';
  const { projects, preferredProject } = React.useContext(ProjectsContext);
  const {
    activeProject,
    projects: workingProjects,
    selectProject,
    registerProjectRouteSync,
    status: workingProjectStatus,
  } = useWorkingProject();
  const { isAdmin } = useUser();
  const isUnifiedProjectSelectorEnabled = useIsAreaAvailable(
    SupportedArea.UNIFIED_PROJECT_SELECTOR,
  ).status;
  const storedProject = getStoredPreferredProject(projects);
  const routeProjects = isUnifiedProjectSelectorEnabled
    ? workingProjects
    : projects.map(({ metadata }) => ({ name: metadata.name }));

  useWorkingProjectRouteSync({
    activeProjectName: activeProject?.name,
    routeProjectName: namespace,
    projects: workingProjects,
    selectProject,
    enabled: isUnifiedProjectSelectorEnabled,
    getProjectPath: getInvalidRedirectPath,
    registerProjectRouteSync: isUnifiedProjectSelectorEnabled
      ? registerProjectRouteSync
      : undefined,
  });

  const hasInvalidWorkingProjectRoute =
    isUnifiedProjectSelectorEnabled &&
    workingProjectStatus === WorkingProjectStatusValue.RouteInvalid;

  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
  if (namespace && (routeProjects.length > 0 || hasInvalidWorkingProjectRoute)) {
    const foundProject = routeProjects.find(({ name }) => name === namespace);
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
  } else if (routeProjects.length === 0) {
    renderStateProps = {
      empty: true,
      emptyStatePage: <ModelTrainingNoProjects />,
    };
  } else {
    const canViewAllProjects = isUnifiedProjectSelectorEnabled && isAdmin && allProjectsRequested;

    const effectiveProjectName = canViewAllProjects
      ? null
      : isUnifiedProjectSelectorEnabled
      ? activeProject?.name
      : (storedProject ?? preferredProject)?.metadata.name;
    if (effectiveProjectName) {
      return <Navigate to={getInvalidRedirectPath(effectiveProjectName)} replace />;
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

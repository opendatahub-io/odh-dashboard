import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { getStoredPreferredProject } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import InvalidProject from '@odh-dashboard/ui-core/components/InvalidProject';
import EmptyStateErrorMessage from '@odh-dashboard/ui-core/components/EmptyStateErrorMessage';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useWorkingProjectRouteSync } from '@odh-dashboard/plugin-core/routing';
import {
  requiresWorkingProjectSelection,
  useWorkingProject,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import PipelineCoreNoProjects from '#~/pages/pipelines/global/PipelineCoreNoProjects';
import { PipelineContextProvider } from '#~/concepts/pipelines/context';
import { ProjectObjectType } from '#~/concepts/design/utils';
import PipelineCoreProjectSelector from './PipelineCoreProjectSelector';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type EmptyStateProps = 'emptyStatePage' | 'empty';

type GlobalPipelineCoreLoaderProps = {
  strict?: boolean;
  getInvalidRedirectPath: (namespace: string) => string;
  objectType?: ProjectObjectType;
} & Omit<
  ApplicationPageProps,
  'loaded' | 'headerContent' | 'provideChildrenPadding' | EmptyStateProps
>;

type ApplicationPageRenderState = Pick<ApplicationPageProps, EmptyStateProps>;

const GlobalPipelineCoreLoader: React.FC<GlobalPipelineCoreLoaderProps> = ({
  strict = false,
  getInvalidRedirectPath,
  objectType,
  ...applicationPageProps
}) => {
  const { namespace } = useParams<{ namespace: string }>();
  const { projects, preferredProject } = React.useContext(ProjectsContext);
  const storedProject = getStoredPreferredProject(projects);
  const isUnifiedProjectSelectorEnabled = useIsAreaAvailable(
    SupportedArea.UNIFIED_PROJECT_SELECTOR,
  ).status;
  const {
    activeProject,
    projects: workingProjects,
    selectProject,
    registerProjectRouteSync,
    status: workingProjectStatus,
  } = useWorkingProject();
  useWorkingProjectRouteSync({
    activeProjectName: activeProject?.name,
    routeProjectName: namespace,
    projects: workingProjects,
    selectProject,
    enabled: isUnifiedProjectSelectorEnabled,
    getProjectPath: getInvalidRedirectPath,
    registerProjectRouteSync,
    // Pipeline route suffixes carry resource ids (runs, artifacts, executions, definitions), so a
    // project switch must land on the section base route instead of another project's resource.
    preserveRouteState: false,
  });

  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
  const requiresProjectSelection =
    isUnifiedProjectSelectorEnabled && requiresWorkingProjectSelection(workingProjectStatus);
  if (projects.length === 0 && !requiresProjectSelection) {
    renderStateProps = {
      empty: true,
      emptyStatePage: <PipelineCoreNoProjects />,
    };
  } else if (namespace) {
    const foundProject = projects.find(byName(namespace));
    if (foundProject) {
      // Render the content
      return (
        // Only the unified selector switches the project without a route remount, and pipeline
        // state (runs, artifacts, definitions) belongs to one project, so the gate off keeps the
        // existing provider instance.
        <PipelineContextProvider
          namespace={namespace}
          key={isUnifiedProjectSelectorEnabled ? namespace : undefined}
        >
          <Outlet />
        </PipelineContextProvider>
      );
    }

    // They ended up on a non-valid project path
    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <InvalidProject
          namespace={namespace}
          getRedirectPath={getInvalidRedirectPath}
          hideProjectSelector={isUnifiedProjectSelectorEnabled}
        />
      ),
    };
  } else if (requiresProjectSelection) {
    // Projects may exist without an active selection, so "No projects" would be misleading here.
    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <EmptyStateErrorMessage
          title="Select a project to begin"
          bodyText="Choose a project from the project selector to continue."
        />
      ),
    };
  } else {
    const redirectProjectName = isUnifiedProjectSelectorEnabled
      ? activeProject?.name
      : (storedProject ?? preferredProject ?? projects[0]).metadata.name;

    if ((!strict || isUnifiedProjectSelectorEnabled) && redirectProjectName) {
      // Redirect the namespace suffix into the URL
      return <Navigate to={getInvalidRedirectPath(redirectProjectName)} replace />;
    }

    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <InvalidProject
          namespace={namespace}
          getRedirectPath={getInvalidRedirectPath}
          hideProjectSelector={isUnifiedProjectSelectorEnabled}
        />
      ),
    };
  }

  return (
    <ApplicationsPage
      {...applicationPageProps}
      {...renderStateProps}
      loaded
      headerContent={
        !strict &&
        !isUnifiedProjectSelectorEnabled && (
          <PipelineCoreProjectSelector
            getRedirectPath={getInvalidRedirectPath}
            objectType={objectType}
          />
        )
      }
      provideChildrenPadding
    />
  );
};
export default GlobalPipelineCoreLoader;

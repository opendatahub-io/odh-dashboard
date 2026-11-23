import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { ApplicationsPage } from 'mod-arch-shared';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useWorkingProjectRouteSync } from '@odh-dashboard/plugin-core/routing';
import {
  requiresWorkingProjectSelection,
  useWorkingProject,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { useNamespaceSelectorWithPersistence } from './hooks/useNamespaceSelectorWithPersistence';
import GenAiCoreNoProjects from './GenAiCoreNoProjects';
import GenAiCoreInvalidProject from './GenAiCoreInvalidProject';
import ModelsEmptyState from './EmptyStates/NoData';
import { GenAiContextProvider } from './context/GenAiContext';
import GenAiCoreHeader from './GenAiCoreHeader';
import { IconType } from './types';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type EmptyStateProps = 'emptyStatePage' | 'empty';

type GenAiCoreLoaderProps = {
  getInvalidRedirectPath: (namespace: string) => string;
  title: string;
  icon?: IconType;
  allowNoProjects?: boolean;
} & Omit<
  ApplicationPageProps,
  'loaded' | 'headerContent' | 'provideChildrenPadding' | EmptyStateProps
>;

type ApplicationPageRenderState = Pick<ApplicationPageProps, EmptyStateProps>;

const GenAiCoreLoader: React.FC<GenAiCoreLoaderProps> = ({
  getInvalidRedirectPath,
  title,
  icon,
  allowNoProjects = false,
  ...applicationPageProps
}) => {
  const { namespace } = useParams<{ namespace: string }>();
  const isUnifiedProjectSelectorEnabled = useIsAreaAvailable(
    SupportedArea.UNIFIED_PROJECT_SELECTOR,
  ).status;
  const { namespaces, namespacesLoaded, preferredNamespace } =
    useNamespaceSelectorWithPersistence();
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
  });

  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
  if (namespaces.length === 0) {
    if (allowNoProjects && !namespace && namespacesLoaded) {
      return (
        <GenAiContextProvider>
          <Outlet />
        </GenAiContextProvider>
      );
    }
    renderStateProps = {
      empty: true,
      emptyStatePage: <GenAiCoreNoProjects />,
    };
  } else if (namespace) {
    const routeProjects = isUnifiedProjectSelectorEnabled ? workingProjects : namespaces;
    const foundProject = routeProjects.find((n) => n.name === namespace);
    if (foundProject) {
      // Render the content
      return (
        <GenAiContextProvider key={namespace} namespaceParam={namespace}>
          <Outlet />
        </GenAiContextProvider>
      );
    }

    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <GenAiCoreInvalidProject namespace={namespace} getRedirectPath={getInvalidRedirectPath} />
      ),
    };
  } else {
    const shouldSelectProject =
      isUnifiedProjectSelectorEnabled && requiresWorkingProjectSelection(workingProjectStatus);

    if (shouldSelectProject) {
      renderStateProps = {
        empty: true,
        emptyStatePage: (
          <ModelsEmptyState
            title="Select a project to begin"
            description="Choose a project from the project selector to continue."
          />
        ),
      };
    } else {
      const redirectNamespace = isUnifiedProjectSelectorEnabled
        ? activeProject
        : (preferredNamespace ?? namespaces[0]);

      if (redirectNamespace) {
        return <Navigate to={getInvalidRedirectPath(redirectNamespace.name)} replace />;
      }

      renderStateProps = {
        empty: true,
        emptyStatePage: <GenAiCoreNoProjects />,
      };
    }
  }

  return (
    <ApplicationsPage
      {...applicationPageProps}
      {...renderStateProps}
      title={<GenAiCoreHeader title={title} icon={icon} getRedirectPath={getInvalidRedirectPath} />}
      loaded={namespacesLoaded}
      provideChildrenPadding
    />
  );
};
export default GenAiCoreLoader;

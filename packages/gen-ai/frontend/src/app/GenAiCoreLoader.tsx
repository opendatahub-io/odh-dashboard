import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { ApplicationsPage } from 'mod-arch-shared';
import { resolveWorkingProject } from '@odh-dashboard/foundation';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useWorkingProjectRouteSync } from '@odh-dashboard/plugin-core/routing';
import { useWorkingProject } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { useNamespaceSelectorWithPersistence } from './hooks/useNamespaceSelectorWithPersistence';
import GenAiCoreNoProjects from './GenAiCoreNoProjects';
import GenAiCoreInvalidProject from './GenAiCoreInvalidProject';
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
  const { namespaces, namespacesLoaded, preferredNamespace } =
    useNamespaceSelectorWithPersistence();
  const { activeProject, projects: workingProjects, selectProject } = useWorkingProject();
  const isUnifiedProjectSelectorEnabled = useIsAreaAvailable(
    SupportedArea.UNIFIED_PROJECT_SELECTOR,
  ).status;

  useWorkingProjectRouteSync({
    activeProjectName: activeProject?.name,
    routeProjectName: namespace,
    projects: workingProjects,
    selectProject,
    enabled: isUnifiedProjectSelectorEnabled,
    getProjectLocation: (projectName) => ({
      pathname: getInvalidRedirectPath(projectName),
    }),
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
    const foundProject = namespaces.find((n) => n.name === namespace);
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
    const activeNamespace = isUnifiedProjectSelectorEnabled
      ? namespaces.find((candidate) => candidate.name === activeProject?.name)
      : undefined;
    const redirectNamespace = resolveWorkingProject({
      list: { status: 'listed', projects: namespaces },
      route: null,
      storedName: activeNamespace?.name ?? preferredNamespace?.name,
    }).activeProject;

    if (redirectNamespace) {
      return <Navigate to={getInvalidRedirectPath(redirectNamespace.name)} replace />;
    }

    renderStateProps = {
      empty: true,
      emptyStatePage: <GenAiCoreNoProjects />,
    };
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

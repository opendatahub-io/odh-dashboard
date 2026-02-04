import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage } from 'mod-arch-shared';
import {
  getPreferredProject,
  clearPreferredProject,
} from '@odh-dashboard/internal/concepts/projects/preferredProjectStorage';
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
} & Omit<
  ApplicationPageProps,
  'loaded' | 'headerContent' | 'provideChildrenPadding' | EmptyStateProps
>;

type ApplicationPageRenderState = Pick<ApplicationPageProps, EmptyStateProps>;

const GenAiCoreLoader: React.FC<GenAiCoreLoaderProps> = ({
  getInvalidRedirectPath,
  title,
  icon,
  ...applicationPageProps
}) => {
  const { namespace } = useParams<{ namespace: string }>();
  const { namespaces, namespacesLoaded, preferredNamespace } = useNamespaceSelector();

  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
  if (namespaces.length === 0) {
    renderStateProps = {
      empty: true,
      emptyStatePage: <GenAiCoreNoProjects />,
    };
  } else if (namespace) {
    const foundProject = namespaces.find((n) => n.name === namespace);
    if (foundProject) {
      // Render the content
      return (
        <GenAiContextProvider namespaceParam={namespace}>
          <Outlet />
        </GenAiContextProvider>
      );
    }

    // They ended up on a non-valid project path
    // Clear sessionStorage since the project doesn't exist anymore
    clearPreferredProject();
    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <GenAiCoreInvalidProject namespace={namespace} getRedirectPath={getInvalidRedirectPath} />
      ),
    };
  } else {
    // When no namespace in URL, determine which namespace to redirect to
    // Priority: ODH preferredProject (from sessionStorage) > mod-arch-core preferredNamespace > first namespace
    // ODH takes priority so that navigating from ODH into gen-ai uses the project selected in ODH
    const odhPreferredProjectName = getPreferredProject();
    const odhPreferredNamespace = odhPreferredProjectName
      ? namespaces.find((n) => n.name === odhPreferredProjectName)
      : undefined;

    // If the preferred project from sessionStorage doesn't exist, clear it
    if (odhPreferredProjectName && !odhPreferredNamespace) {
      clearPreferredProject();
    }

    const redirectNamespace = odhPreferredNamespace ?? preferredNamespace ?? namespaces[0];
    return <Navigate to={getInvalidRedirectPath(redirectNamespace.name)} replace />;
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

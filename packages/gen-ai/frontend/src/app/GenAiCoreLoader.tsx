import * as React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage } from 'mod-arch-shared';
import GenAiCoreNoProjects from './GenAiCoreNoProjects';
import GenAiCoreInvalidProject from './GenAiCoreInvalidProject';
import { GenAiContextProvider } from './context/GenAiContext';
import GenAiCoreHeader from './GenAiCoreHeader';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type EmptyStateProps = 'emptyStatePage' | 'empty';

type GenAiCoreLoaderProps = {
  getInvalidRedirectPath: (namespace: string) => string;
  title: string;
} & Omit<
  ApplicationPageProps,
  'loaded' | 'headerContent' | 'provideChildrenPadding' | EmptyStateProps
>;

type ApplicationPageRenderState = Pick<ApplicationPageProps, EmptyStateProps>;

const GenAiCoreLoader: React.FC<GenAiCoreLoaderProps> = ({
  getInvalidRedirectPath,
  title,
  ...applicationPageProps
}) => {
  const { namespace } = useParams<{ namespace: string }>();
  const { namespaces, namespacesLoaded, preferredNamespace } = useNamespaceSelector();

  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
  if (namespaces.length === 0) {
    renderStateProps = {
      empty: true,
      emptyStatePage: <GenAiCoreNoProjects getRedirectPath={getInvalidRedirectPath} />,
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
    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <GenAiCoreInvalidProject namespace={namespace} getRedirectPath={getInvalidRedirectPath} />
      ),
    };
  } else {
    const redirectNamespace = preferredNamespace ?? namespaces[0];
    return <Navigate to={getInvalidRedirectPath(redirectNamespace.name)} replace />;
  }

  return (
    <ApplicationsPage
      {...applicationPageProps}
      {...renderStateProps}
      title={<GenAiCoreHeader title={title} getRedirectPath={getInvalidRedirectPath} />}
      loaded={namespacesLoaded}
      provideChildrenPadding
    />
  );
};
export default GenAiCoreLoader;

import { Bullseye, Spinner } from '@patternfly/react-core';
import React, { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/authContext';

const ChatbotMain = lazy(() =>
  import('./Chatbot/ChatbotMain').then((module) => ({ default: module.ChatbotMain })),
);
const NotFound = lazy(() => import('./NotFound/NotFound'));
const OAuthCallback = lazy(() => import('./OAuth/OAuthCallback'));

// Protected route wrapper component
function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated, isLoading, isOAuthEnabled, handleAuthenticationCheck } = useAuth();

  React.useEffect(() => {
    // Only check authentication if OAuth is enabled and we're not already authenticated
    if (isOAuthEnabled && !isAuthenticated && !isLoading) {
      handleAuthenticationCheck().catch((error) => {
        // eslint-disable-next-line no-console
        console.error('[ProtectedRoute] Authentication check failed:', error);
      });
    }
  }, [isOAuthEnabled, isAuthenticated, isLoading, handleAuthenticationCheck]);

  // Show loading spinner while checking authentication or OAuth config
  if (isLoading) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  // If OAuth is disabled, allow access
  if (isOAuthEnabled === false) {
    return children;
  }

  // If OAuth is enabled and user is not authenticated, show spinner while redirecting
  if (isOAuthEnabled && !isAuthenticated) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return children;
}

export interface IAppRoute {
  label?: string; // Excluding the label will exclude the route from the nav sidebar in AppLayout
  /* eslint-disable @typescript-eslint/no-explicit-any */
  element: React.ReactElement;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  exact?: boolean;
  path: string;
  title: string;
  routes?: undefined;
  protected?: boolean; // New field to indicate if route requires authentication
}

export interface IAppRouteGroup {
  label: string;
  routes: IAppRoute[];
}
export type AppRouteConfig = IAppRoute | IAppRouteGroup;

const routes: AppRouteConfig[] = [
  {
    element: <ChatbotMain />,
    exact: true,
    label: 'Chatbot',
    path: '/',
    title: 'Chatbot Main Page',
    protected: true, // This route requires authentication
  },
];

const flattenedRoutes: IAppRoute[] = routes.reduce(
  (flattened, route) => [...flattened, ...(route.routes ? route.routes : [route])],
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  [] as IAppRoute[],
);

const AppRoutes = (): React.ReactElement => (
  <Suspense
    fallback={
      <Bullseye>
        <Spinner />
      </Bullseye>
    }
  >
    <Routes>
      {/* Dynamic routes from flattened routes array */}
      {flattenedRoutes.map(({ path, element, protected: isProtected }, idx) => (
        <Route
          key={idx}
          path={path}
          element={isProtected ? <ProtectedRoute>{element}</ProtectedRoute> : element}
        />
      ))}
      {/* Authentication routes */}
      <Route path="/oauth/callback" element={<OAuthCallback />} />

      {/* Fallback route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
export { AppRoutes, routes };

import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { isRouteExtension } from '@odh-dashboard/plugin-core/extension-points';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { InvalidArgoDeploymentAlert } from '#~/concepts/pipelines/content/InvalidArgoDeploymentAlert';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import UnauthorizedError from '#~/pages/UnauthorizedError';
import { useUser } from '#~/redux/selectors';

const NotFound = React.lazy(() => import('../pages/NotFound'));

const DependencyMissingPage = React.lazy(
  () => import('#~/pages/dependencies/DependencyMissingPage'),
);

const fallback = <ApplicationsPage title="" description="" loaded={false} empty />;

const AppRoutes: React.FC = () => {
  const { isAllowed } = useUser();
  const routeExtensions = useExtensions(isRouteExtension);

  const dynamicRoutes = React.useMemo(
    () =>
      routeExtensions.map((routeExtension) => (
        <Route
          key={routeExtension.uid}
          path={routeExtension.properties.path}
          element={
            <LazyCodeRefComponent
              key={routeExtension.uid}
              component={routeExtension.properties.component}
              fallback={fallback}
            />
          }
        />
      )),
    [routeExtensions],
  );

  if (!isAllowed) {
    return (
      <Routes>
        <Route path="*" element={<UnauthorizedError />} />
      </Routes>
    );
  }

  return (
    <React.Suspense fallback={fallback}>
      <InvalidArgoDeploymentAlert />
      <Routes>
        {dynamicRoutes}
        <Route path="/dependency-missing/:area" element={<DependencyMissingPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </React.Suspense>
  );
};

export default AppRoutes;

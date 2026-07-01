import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { Spinner, Bullseye } from '@patternfly/react-core';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import {
  isRouteExtension,
  isTabRoutePageExtension,
  isTabRouteTabExtension,
  type TabRoutePageExtension,
  type TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import NotFound from './NotFound';
import TabRoutePage from './TabRoutePage';
import { ErrorBoundary } from './ErrorBoundary';

const fallback = (
  <Bullseye>
    <Spinner />
  </Bullseye>
);

const ShellRoutes: React.FC = () => {
  const routeExtensions = useExtensions(isRouteExtension);
  const tabRoutePageExtensions = useExtensions<TabRoutePageExtension>(isTabRoutePageExtension);
  const tabRouteTabExtensions = useExtensions<TabRouteTabExtension>(isTabRouteTabExtension);

  const usableTabRoutePages = React.useMemo(
    () =>
      tabRoutePageExtensions.filter((page) =>
        tabRouteTabExtensions.some((tab) => tab.properties.pageId === page.properties.id),
      ),
    [tabRoutePageExtensions, tabRouteTabExtensions],
  );

  const dynamicRoutes = React.useMemo(
    () =>
      routeExtensions.map((routeExtension) => (
        <Route
          key={routeExtension.uid}
          path={routeExtension.properties.path}
          element={
            <ErrorBoundary>
              <LazyCodeRefComponent
                key={routeExtension.uid}
                component={routeExtension.properties.component}
                fallback={fallback}
              />
            </ErrorBoundary>
          }
        />
      )),
    [routeExtensions],
  );

  const tabRoutePages = React.useMemo(
    () =>
      usableTabRoutePages.map((pageExtension) => (
        <Route
          key={pageExtension.uid}
          path={pageExtension.properties.path}
          element={
            <ErrorBoundary>
              <TabRoutePage extension={pageExtension} />
            </ErrorBoundary>
          }
        />
      )),
    [usableTabRoutePages],
  );

  const hasRoutes = dynamicRoutes.length > 0 || usableTabRoutePages.length > 0;

  return (
    <React.Suspense fallback={fallback}>
      <Routes>
        {dynamicRoutes}
        {tabRoutePages}
        <Route path="*" element={<NotFound hasRoutes={hasRoutes} />} />
      </Routes>
    </React.Suspense>
  );
};

export default ShellRoutes;

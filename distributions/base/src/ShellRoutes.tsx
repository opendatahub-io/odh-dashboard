import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { PageSection, EmptyState, EmptyStateBody, Spinner, Bullseye } from '@patternfly/react-core';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { isRouteExtension } from '@odh-dashboard/plugin-core/extension-points';

const fallback = (
  <Bullseye>
    <Spinner />
  </Bullseye>
);

const NotFound: React.FC<{ hasRoutes: boolean }> = ({ hasRoutes }) => (
  <PageSection hasBodyWrapper={false}>
    <EmptyState headingLevel="h1" titleText={hasRoutes ? 'Page not found' : 'No features loaded'}>
      <EmptyStateBody>
        {hasRoutes
          ? 'The requested page could not be found. Check the URL or navigate using the sidebar.'
          : 'This is the base shell framework. Add a distribution layer to enable features.'}
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

const ShellRoutes: React.FC = () => {
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

  return (
    <React.Suspense fallback={fallback}>
      <Routes>
        {dynamicRoutes}
        <Route path="*" element={<NotFound hasRoutes={dynamicRoutes.length > 0} />} />
      </Routes>
    </React.Suspense>
  );
};

export default ShellRoutes;

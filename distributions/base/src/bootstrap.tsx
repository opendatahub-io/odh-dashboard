import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PageSection, EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { ThemeProvider } from './ThemeContext';
import { ErrorBoundary } from './ErrorBoundary';
import Shell from './Shell';
import Header from './Header';
import NavSidebar from './NavSidebar';

const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <ThemeProvider>
        <Shell masthead={<Header />} sidebar={<NavSidebar />}>
          <PageSection hasBodyWrapper={false}>
            <EmptyState headingLevel="h1" titleText="No features loaded">
              <EmptyStateBody>
                This is the base shell framework. Add a distribution layer to enable features.
              </EmptyStateBody>
            </EmptyState>
          </PageSection>
        </Shell>
      </ThemeProvider>
    ),
  },
]);

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </React.StrictMode>,
);

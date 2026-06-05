import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ExtensibilityContextProvider } from './plugins/ExtensibilityContext';
import {
  Shell,
  ShellHeader,
  ShellNav,
  ShellRoutes,
  ThemeProvider,
  ErrorBoundary,
} from '../../base/src/lib';

const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <ThemeProvider>
        <ExtensibilityContextProvider>
          <Shell masthead={<ShellHeader />} sidebar={<ShellNav />}>
            <ShellRoutes />
          </Shell>
        </ExtensibilityContextProvider>
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

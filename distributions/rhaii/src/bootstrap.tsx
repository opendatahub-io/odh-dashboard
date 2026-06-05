import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ExtensibilityContextProvider } from './plugins/ExtensibilityContext';
import { ThemeProvider } from '../../base/src/ThemeContext';
import { ErrorBoundary } from '../../base/src/ErrorBoundary';
import Shell from '../../base/src/Shell';
import ShellHeader from '../../base/src/ShellHeader';
import ShellNav from '../../base/src/ShellNav';
import ShellRoutes from '../../base/src/ShellRoutes';

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

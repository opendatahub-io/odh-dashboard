import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { BrowserStorageContextProvider } from '@odh-dashboard/ui-core/hooks';
import { bufferCspViolationsUntilReporter } from '#~/concepts/csp/cspViolations';
import { useCspViolationReporter } from '#~/concepts/csp/useCspViolationReporter';
import { sdkStore, store } from './redux/store/store';
import App from './app/App';
import { ThemeProvider } from './app/ThemeContext';
import { NotificationProvider } from './utilities/NotificationProvider';
import SDKInitialize from './SDKInitialize';
import ErrorBoundary from './components/error/ErrorBoundary';
import RouteErrorElement from './components/error/RouteErrorElement';
import { ReduxContext } from './redux/context';
import { installMonacoLoader } from './concepts/dashboard/codeEditor/monacoLoader';

// Record violations from the first moment this module runs. The reporter mounts on the first
// render and replays what this buffered, so violations raised while the document loads and
// while SDK initialization withholds the tree are not lost.
bufferCspViolationsUntilReporter();

// Configure the one shared Monaco loader before any host or remote code editor can mount.
installMonacoLoader();

/** Mounts CSP violation capture once for the legacy dashboard. Renders nothing. */
const CspViolationCapture: React.FC = () => {
  useCspViolationReporter();
  return null;
};

// Creates a data router using createBrowserRouter
const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <>
        {/* Installed before SDK initialization, which renders nothing until the SDK is ready. */}
        <CspViolationCapture />
        <SDKInitialize>
          <BrowserStorageContextProvider>
            <ThemeProvider>
              <NotificationProvider>
                <App />
              </NotificationProvider>
            </ThemeProvider>
          </BrowserStorageContextProvider>
        </SDKInitialize>
      </>
    ),
    errorElement: <RouteErrorElement />,
  },
]);

/**
 * Main function
 */
// https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#updates-to-client-rendering-apis
// We have to use '!' here for 'document.getElementById('root')' to avoid type errors
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={sdkStore}>
        <Provider store={store} context={ReduxContext}>
          <RouterProvider router={router} />
        </Provider>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>,
);

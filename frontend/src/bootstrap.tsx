import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { sdkStore, store } from './redux/store/store';
import App from './app/App';
import { ThemeProvider } from './app/ThemeContext';
import SDKInitialize from './SDKInitialize';
import { BrowserStorageContextProvider } from './components/browserStorage/BrowserStorageContext';
import ErrorBoundary from './components/error/ErrorBoundary';
import { ReduxContext } from './redux/context';

// Creates a data router using createBrowserRouter
const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <SDKInitialize>
        <BrowserStorageContextProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserStorageContextProvider>
      </SDKInitialize>
    ),
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

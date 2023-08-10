import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './redux/store/store';
import App from './app/App';
import SDKInitialize from './SDKInitialize';
import { BrowserStorageContextProvider } from './components/browserStorage/BrowserStorageContext';
import ErrorBoundary from './components/error/ErrorBoundary';

/**
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
      <Provider store={store}>
        <Router>
          <SDKInitialize>
            <BrowserStorageContextProvider>
              <App />
            </BrowserStorageContextProvider>
          </SDKInitialize>
        </Router>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>,
);

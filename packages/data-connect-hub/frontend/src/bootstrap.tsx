import React from 'react';
import ReactDOM from 'react-dom/client';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import { createStandaloneAnalytics } from '@odh-dashboard/analytics/standalone';
import { BrowserRouter as Router } from 'react-router-dom';
import {
  BrowserStorageContextProvider,
  NotificationContextProvider,
  ModularArchContextProvider,
  ModularArchConfig,
} from 'mod-arch-core';
import {
  BFF_API_VERSION,
  APP_VERSION,
  DEPLOYMENT_MODE,
  DEV_MODE,
  MANDATORY_NAMESPACE,
  URL_PREFIX,
} from '~/app/utilities/const';
import App from '~/app/App';
import ToastNotifications from '~/app/components/ToastNotifications';

const standaloneAnalytics = createStandaloneAnalytics({ devMode: DEV_MODE, version: APP_VERSION });
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}
const root = ReactDOM.createRoot(rootElement);

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DEPLOYMENT_MODE,
  URL_PREFIX,
  BFF_API_VERSION,
  mandatoryNamespace: MANDATORY_NAMESPACE,
};

root.render(
  <React.StrictMode>
    <AnalyticsTrackingProvider value={standaloneAnalytics}>
      <Router>
        <ModularArchContextProvider config={modularArchConfig}>
          <BrowserStorageContextProvider>
            <NotificationContextProvider>
              <App />
              <ToastNotifications />
            </NotificationContextProvider>
          </BrowserStorageContextProvider>
        </ModularArchContextProvider>
      </Router>
    </AnalyticsTrackingProvider>
  </React.StrictMode>,
);

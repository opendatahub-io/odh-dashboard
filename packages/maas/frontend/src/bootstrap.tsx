/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Overlay file copied into the starter repo where path aliases are configured.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import {
  BrowserStorageContextProvider,
  NotificationContextProvider,
  ModularArchContextProvider,
  ModularArchConfig,
} from 'mod-arch-core';
import {
  BFF_API_VERSION,
  DEPLOYMENT_MODE,
  MANDATORY_NAMESPACE,
  API_URL_PREFIX,
} from '~/app/utilities/const';
import App from '~/app/App';
import ToastNotifications from '~/app/components/ToastNotifications';
import {
  GRID_MANDATORY_NAMESPACE,
  isGridFeatureFlagEnabledFromDevStorage,
} from '~/app/utilities/gridFeatureFlag';

const root = ReactDOM.createRoot(document.getElementById('root')!);
const isGridEnabled = isGridFeatureFlagEnabledFromDevStorage();

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DEPLOYMENT_MODE,
  URL_PREFIX: API_URL_PREFIX,
  BFF_API_VERSION,
  mandatoryNamespace: MANDATORY_NAMESPACE ?? (isGridEnabled ? GRID_MANDATORY_NAMESPACE : undefined),
};

root.render(
  <React.StrictMode>
    <Router>
      <ModularArchContextProvider config={modularArchConfig}>
        <BrowserStorageContextProvider>
          <NotificationContextProvider>
            <ToastNotifications />
            <App />
          </NotificationContextProvider>
        </BrowserStorageContextProvider>
      </ModularArchContextProvider>
    </Router>
  </React.StrictMode>,
);

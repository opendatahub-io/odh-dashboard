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
  URL_PREFIX,
} from '~/app/utilities/const';
import App from '~/app/App';

const root = ReactDOM.createRoot(document.getElementById('root')!);

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DEPLOYMENT_MODE,
  URL_PREFIX,
  BFF_API_VERSION,
  mandatoryNamespace: MANDATORY_NAMESPACE,
};

root.render(
  <React.StrictMode>
    <Router>
      <ModularArchContextProvider config={modularArchConfig}>
        <BrowserStorageContextProvider>
          <NotificationContextProvider>
            <App />
          </NotificationContextProvider>
        </BrowserStorageContextProvider>
      </ModularArchContextProvider>
    </Router>
  </React.StrictMode>,
);

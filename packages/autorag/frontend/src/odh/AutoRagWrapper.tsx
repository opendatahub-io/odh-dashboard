import React from 'react';
import {
  ModularArchConfig,
  DeploymentMode,
  ModularArchContextProvider,
  NotificationContextProvider,
  BrowserStorageContextProvider,
} from 'mod-arch-core';
// Note: Using relative imports instead of tilde aliases (~/app/...) because this file
// may be compiled by the main dashboard's webpack when loaded via the `exports` field
// in package.json. The main dashboard's webpack doesn't have the `~` alias configured
// for autorag's internal paths. Tilde imports only work when autorag's own webpack
// compiles this file (runtime/federated loading).
import { URL_PREFIX } from '../app/utilities/const';
import MainPage from '../app/pages/MainPage';

const autoRagConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

const AutoRagWrapper: React.FC = () => (
  <ModularArchContextProvider config={autoRagConfig}>
    <BrowserStorageContextProvider>
      <NotificationContextProvider>
        <MainPage />
      </NotificationContextProvider>
    </BrowserStorageContextProvider>
  </ModularArchContextProvider>
);

export default AutoRagWrapper;

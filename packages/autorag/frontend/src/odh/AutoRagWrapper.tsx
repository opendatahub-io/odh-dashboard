import React from 'react';
import {
  ModularArchConfig,
  DeploymentMode,
  ModularArchContextProvider,
  NotificationContextProvider,
  BrowserStorageContextProvider,
} from 'mod-arch-core';
import { URL_PREFIX } from '~/app/utilities/const';
import MainPage from '~/app/pages/MainPage';

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

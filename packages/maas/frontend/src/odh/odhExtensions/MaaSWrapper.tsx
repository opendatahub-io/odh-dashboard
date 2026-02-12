import React from 'react';
import {
  ModularArchConfig,
  DeploymentMode,
  ModularArchContextProvider,
  NotificationContextProvider,
  BrowserStorageContextProvider,
} from 'mod-arch-core';
import { URL_PREFIX } from '~/app/utilities/const';
import AppRoutes from '~/app/AppRoutes';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

const MaasWrapper: React.FC = () => (
  <ModularArchContextProvider config={modularArchConfig}>
    <BrowserStorageContextProvider>
      <NotificationContextProvider>
        <AppRoutes />
      </NotificationContextProvider>
    </BrowserStorageContextProvider>
  </ModularArchContextProvider>
);

export default MaasWrapper;

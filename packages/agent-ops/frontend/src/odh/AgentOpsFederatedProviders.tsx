import * as React from 'react';
import {
  BrowserStorageContextProvider,
  DeploymentMode,
  ModularArchConfig,
  ModularArchContextProvider,
  NotificationContextProvider,
} from 'mod-arch-core';
import { URL_PREFIX } from '~/app/utilities/const';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

type AgentOpsFederatedProvidersProps = {
  children: React.ReactNode;
};

const AgentOpsFederatedProviders: React.FC<AgentOpsFederatedProvidersProps> = ({ children }) => (
  <ModularArchContextProvider config={modularArchConfig}>
    <BrowserStorageContextProvider>
      <NotificationContextProvider>{children}</NotificationContextProvider>
    </BrowserStorageContextProvider>
  </ModularArchContextProvider>
);

export default AgentOpsFederatedProviders;

import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  BrowserStorageContextProvider,
  DeploymentMode,
  ModularArchConfig,
  ModularArchContextProvider,
  NotificationContextProvider,
} from 'mod-arch-core';
import { createAgentOpsQueryClient } from '~/app/hooks/queryClient';
import { URL_PREFIX } from '~/app/utilities/const';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

const queryClient = createAgentOpsQueryClient();

type AgentOpsFederatedProvidersProps = {
  children: React.ReactNode;
};

const AgentOpsFederatedProviders: React.FC<AgentOpsFederatedProvidersProps> = ({ children }) => (
  <ModularArchContextProvider config={modularArchConfig}>
    <BrowserStorageContextProvider>
      <NotificationContextProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </NotificationContextProvider>
    </BrowserStorageContextProvider>
  </ModularArchContextProvider>
);

export default AgentOpsFederatedProviders;

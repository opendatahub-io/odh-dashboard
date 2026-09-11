import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  BrowserStorageContextProvider,
  DeploymentMode,
  ModularArchConfig,
  ModularArchContextProvider,
  NotificationContextProvider,
} from 'mod-arch-core';
import { createWorkspacesQueryClient } from '~/app/hooks/queryClient';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import OpenShellUpstreamProviders from './OpenShellUpstreamProviders';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION,
};

type OpenShellFederatedProvidersProps = {
  children: React.ReactNode;
};

const OpenShellFederatedProviders: React.FC<OpenShellFederatedProvidersProps> = ({
  children,
}) => {
  const [queryClient] = React.useState(createWorkspacesQueryClient);

  return (
    <ModularArchContextProvider config={modularArchConfig}>
      <BrowserStorageContextProvider>
        <NotificationContextProvider>
          <QueryClientProvider client={queryClient}>
            <OpenShellUpstreamProviders>{children}</OpenShellUpstreamProviders>
          </QueryClientProvider>
        </NotificationContextProvider>
      </BrowserStorageContextProvider>
    </ModularArchContextProvider>
  );
};

export default OpenShellFederatedProviders;

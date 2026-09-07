import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BrowserStorageContextProvider,
  DeploymentMode,
  ModularArchConfig,
  ModularArchContextProvider,
  NotificationContextProvider,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import OpenShellUpstreamProviders from './OpenShellUpstreamProviders';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION,
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
    mutations: {
      gcTime: Infinity,
    },
  },
});

type OpenShellFederatedProvidersProps = {
  children: React.ReactNode;
};

const OpenShellFederatedProviders: React.FC<OpenShellFederatedProvidersProps> = ({ children }) => (
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

export default OpenShellFederatedProviders;

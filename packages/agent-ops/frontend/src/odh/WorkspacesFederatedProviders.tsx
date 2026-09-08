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
import WorkspacesUpstreamProviders from './WorkspacesUpstreamProviders';

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

type WorkspacesFederatedProvidersProps = {
  children: React.ReactNode;
};

const WorkspacesFederatedProviders: React.FC<WorkspacesFederatedProvidersProps> = ({
  children,
}) => (
  <ModularArchContextProvider config={modularArchConfig}>
    <BrowserStorageContextProvider>
      <NotificationContextProvider>
        <QueryClientProvider client={queryClient}>
          <WorkspacesUpstreamProviders>{children}</WorkspacesUpstreamProviders>
        </QueryClientProvider>
      </NotificationContextProvider>
    </BrowserStorageContextProvider>
  </ModularArchContextProvider>
);

export default WorkspacesFederatedProviders;

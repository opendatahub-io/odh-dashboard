import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModularArchConfig, DeploymentMode, ModularArchContextProvider } from 'mod-arch-core';
import { AppRoutes } from '~/app/AppRoutes';
import { URL_PREFIX } from '~/app/utilities/const';
import { UserContextProvider } from '~/app/context/UserContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

const GenAiWrapper: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <ModularArchContextProvider config={modularArchConfig}>
      <UserContextProvider>
        <AppRoutes />
      </UserContextProvider>
    </ModularArchContextProvider>
  </QueryClientProvider>
);

export default GenAiWrapper;

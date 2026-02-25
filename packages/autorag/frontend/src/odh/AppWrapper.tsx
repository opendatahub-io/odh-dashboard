import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BrowserStorageContextProvider,
  DeploymentMode,
  ModularArchConfig,
  ModularArchContextProvider,
  NotificationContextProvider,
} from 'mod-arch-core';
import React from 'react';
import AppRoutes from '~/app/AppRoutes';
import { useAutoragMockPipelines } from '~/app/hooks/useAutoragMockPipelines';
import { URL_PREFIX } from '~/app/utilities/const';

/** Ensures window.setAutoragMockPipelines is available when Autorag is loaded */
function AutoragMockPipelinesBridge(): null {
  useAutoragMockPipelines();
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      gcTime: Infinity,
    },
  },
});

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

function AppWrapper(): React.JSX.Element {
  return (
    <ModularArchContextProvider config={modularArchConfig}>
      <BrowserStorageContextProvider>
        <NotificationContextProvider>
          <QueryClientProvider client={queryClient}>
            <AutoragMockPipelinesBridge />
            <AppRoutes />
          </QueryClientProvider>
        </NotificationContextProvider>
      </BrowserStorageContextProvider>
    </ModularArchContextProvider>
  );
}

export default AppWrapper;

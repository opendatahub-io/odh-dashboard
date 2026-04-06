import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ModularArchConfig,
  DeploymentMode,
  ModularArchContextProvider,
  NotificationContextProvider,
} from 'mod-arch-core';
import { AppRoutes } from '~/app/AppRoutes';
import { URL_PREFIX } from '~/app/utilities/const';
import { UserContextProvider } from '~/app/context/UserContext';
import { useNotificationListener } from '~/odh/hooks/useNotificationListener';

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

const NotificationBridge: React.FC<React.PropsWithChildren> = ({ children }) => {
  useNotificationListener();
  return <>{children}</>;
};

const GenAiWrapper: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <ModularArchContextProvider config={modularArchConfig}>
      <NotificationContextProvider>
        <NotificationBridge>
          <UserContextProvider>
            <AppRoutes />
          </UserContextProvider>
        </NotificationBridge>
      </NotificationContextProvider>
    </ModularArchContextProvider>
  </QueryClientProvider>
);

export default GenAiWrapper;

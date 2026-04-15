import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import classNames from 'classnames';
import { DeploymentMode, ModularArchConfig, ModularArchContextProvider } from 'mod-arch-core';
import React from 'react';
import AppRoutes from '~/app/AppRoutes';
import ToastNotifications from '~/app/components/ToastNotifications';
import { URL_PREFIX } from '~/app/utilities/const';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
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
      <QueryClientProvider client={queryClient}>
        <div
          className={classNames(
            'pf-v6-u-h-100',
            'pf-v6-u-display-flex',
            'pf-v6-u-flex-direction-column',
          )}
        >
          <AppRoutes />
        </div>
        <ToastNotifications />
      </QueryClientProvider>
    </ModularArchContextProvider>
  );
}

export default AppWrapper;

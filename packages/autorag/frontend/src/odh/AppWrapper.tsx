import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import classNames from 'classnames';
import {
  BrowserStorageContextProvider,
  DeploymentMode,
  ModularArchConfig,
  ModularArchContextProvider,
  NotificationContextProvider,
} from 'mod-arch-core';
import React from 'react';
import AppRoutes from '~/app/AppRoutes';
import { URL_PREFIX } from '~/app/utilities/const';

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
            <div
              className={classNames(
                'pf-v6-u-h-100',
                'pf-v6-u-display-flex',
                'pf-v6-u-flex-direction-column',
              )}
            >
              <AppRoutes />
            </div>
          </QueryClientProvider>
        </NotificationContextProvider>
      </BrowserStorageContextProvider>
    </ModularArchContextProvider>
  );
}

export default AppWrapper;

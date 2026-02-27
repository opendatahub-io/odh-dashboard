import React from 'react';
import ReactDOM from 'react-dom/client';
import { ModularArchConfig, ModularArchContextProvider } from 'mod-arch-core';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axe from 'react-axe';
import { DEPLOYMENT_MODE, URL_PREFIX } from '~/app/utilities/const';
import App from '~/app/App';
import { PluginStoreContextProvider } from '~/odh/PluginStoreContextProvider';

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
  deploymentMode: DEPLOYMENT_MODE,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

if (process.env.NODE_ENV !== 'production') {
  const config = {
    rules: [
      {
        id: 'color-contrast',
        enabled: false,
      },
    ],
  };
  axe(React, ReactDOM, 1000, config);
}

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const root = ReactDOM.createRoot(document.getElementById('root') as Element);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <PluginStoreContextProvider>
          <ModularArchContextProvider config={modularArchConfig}>
            <App />
          </ModularArchContextProvider>
        </PluginStoreContextProvider>
      </Router>
    </QueryClientProvider>
  </React.StrictMode>,
);

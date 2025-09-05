import React from 'react';
import {
  BrowserStorageContextProvider,
  NotificationContextProvider,
  ModularArchContextProvider,
  ModularArchConfig,
  DeploymentMode,
} from 'mod-arch-core';
import { ThemeProvider, Theme } from 'mod-arch-kubeflow';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { AppContext } from '~/app/context/AppContext';
import ModelCatalogRoutes from '~/app/pages/modelCatalog/ModelCatalogRoutes';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION,
};

const ModelCatalogWrapper: React.FC = () => {
  return (
    <AppContext.Provider
      value={{
        // TODO: remove this once we have a proper config
        config: { common: { featureFlags: { modelRegistry: true } } },
        user: { userId: 'test', clusterAdmin: true },
      }}
    >
      <ModularArchContextProvider config={modularArchConfig}>
        <ThemeProvider theme={Theme.Patternfly}>
          <BrowserStorageContextProvider>
            <NotificationContextProvider>
              <ModelCatalogRoutes />
            </NotificationContextProvider>
          </BrowserStorageContextProvider>
        </ThemeProvider>
      </ModularArchContextProvider>
    </AppContext.Provider>
  );
};
export default ModelCatalogWrapper;

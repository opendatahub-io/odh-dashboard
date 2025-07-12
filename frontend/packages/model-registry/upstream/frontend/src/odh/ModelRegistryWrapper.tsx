import React from 'react';
import {
  BrowserStorageContextProvider,
  NotificationContextProvider,
  ModularArchContextProvider,
  ModularArchConfig,
  ThemeProvider,
  Theme,
  DeploymentMode,
} from 'mod-arch-shared';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import ModelRegistryRoutes from '~/app/pages/modelRegistry/ModelRegistryRoutes';
import { ModelRegistrySelectorContextProvider } from '~/app/context/ModelRegistrySelectorContext';
import { AppContext } from '~/app/context/AppContext';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION,
  mandatoryNamespace: 'kubeflow',
};

const ModelRegistryWrapper: React.FC = () => {
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
              <ModelRegistrySelectorContextProvider>
                <ModelRegistryRoutes />
              </ModelRegistrySelectorContextProvider>
            </NotificationContextProvider>
          </BrowserStorageContextProvider>
        </ThemeProvider>
      </ModularArchContextProvider>
    </AppContext.Provider>
  );
};
export default ModelRegistryWrapper;

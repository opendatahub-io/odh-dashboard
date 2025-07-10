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

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION,
  mandatoryNamespace: 'odh-model-registries',
};

const ModelRegistryWrapper: React.FC = () => {
  return (
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
  );
};
export default ModelRegistryWrapper;
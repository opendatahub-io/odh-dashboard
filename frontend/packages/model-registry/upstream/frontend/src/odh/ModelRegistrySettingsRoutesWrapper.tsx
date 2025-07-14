import React from 'react';
import {
  BrowserStorageContextProvider,
  NotificationContextProvider,
  ModularArchContextProvider,
  ModularArchConfig,
  DeploymentMode,
  ThemeProvider,
  Theme,
} from 'mod-arch-shared';
import { ModelRegistrySelectorContextProvider } from '~/app/context/ModelRegistrySelectorContext';
import ModelRegistrySettingsRoutes from '~/app/pages/settings/ModelRegistrySettingsRoutes';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

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
              <ModelRegistrySettingsRoutes />
            </ModelRegistrySelectorContextProvider>
          </NotificationContextProvider>
        </BrowserStorageContextProvider>
      </ThemeProvider>
    </ModularArchContextProvider>
  );
};

export default ModelRegistryWrapper;

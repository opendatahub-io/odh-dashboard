import React from 'react';
import {
  BrowserStorageContextProvider,
  NotificationContextProvider,
  ModularArchContextProvider,
  ModularArchConfig,
  DeploymentMode,
} from 'mod-arch-core';
import { ThemeProvider, Theme } from 'mod-arch-kubeflow';
import { ModelRegistrySelectorContextProvider } from '~/app/context/ModelRegistrySelectorContext';
import ModelRegistrySettingsRoutes from '~/app/pages/settings/ModelRegistrySettingsRoutes';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import UserInteractionProviderWrapper from '~/odh/components/UserInteractionProviderWrapper';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION,
  mandatoryNamespace: 'odh-model-registries',
};

const ModelRegistryWrapper: React.FC = () => (
  <ModularArchContextProvider config={modularArchConfig}>
    <ThemeProvider theme={Theme.Patternfly}>
      <BrowserStorageContextProvider>
        <NotificationContextProvider>
          <UserInteractionProviderWrapper>
            <ModelRegistrySelectorContextProvider>
              <ModelRegistrySettingsRoutes />
            </ModelRegistrySelectorContextProvider>
          </UserInteractionProviderWrapper>
        </NotificationContextProvider>
      </BrowserStorageContextProvider>
    </ThemeProvider>
  </ModularArchContextProvider>
);

export default ModelRegistryWrapper;

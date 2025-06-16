import React from 'react';
import {
  BrowserStorageContextProvider,
  NotificationContextProvider,
  ModularArchContextProvider,
  ModularArchConfig,
} from 'mod-arch-shared';
import { ModelRegistrySelectorContextProvider } from '~/app/context/ModelRegistrySelectorContext';
import ModelRegistrySettingsRoutes from '~/app/pages/settings/ModelRegistrySettingsRoutes';
import {
  BFF_API_VERSION,
  DEPLOYMENT_MODE,
  PLATFORM_MODE,
  URL_PREFIX,
} from '~/app/utilities/const';

const modularArchConfig: ModularArchConfig = {
  platformMode: PLATFORM_MODE,
  deploymentMode: DEPLOYMENT_MODE,
  URL_PREFIX,
  BFF_API_VERSION,
};

const ModelRegistryWrapper: React.FC = () => {
  return (
    <ModularArchContextProvider config={modularArchConfig}>
      <BrowserStorageContextProvider>
        <NotificationContextProvider>
          <ModelRegistrySelectorContextProvider>
            <ModelRegistrySettingsRoutes />
          </ModelRegistrySelectorContextProvider>
        </NotificationContextProvider>
      </BrowserStorageContextProvider>
    </ModularArchContextProvider>
  );
};

export default ModelRegistryWrapper;

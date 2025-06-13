import React from 'react';
import {
  BrowserStorageContextProvider,
  NotificationContextProvider,
  ModularArchContextProvider,
  ModularArchConfig,
} from 'mod-arch-shared';
import {
  BFF_API_VERSION,
  DEPLOYMENT_MODE,
  PLATFORM_MODE,
  URL_PREFIX,
} from '~/app/utilities/const';
import ModelRegistryRoutes from '~/app/pages/modelRegistry/ModelRegistryRoutes';
import { ModelRegistrySelectorContextProvider } from '~/app/context/ModelRegistrySelectorContext';

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
              <ModelRegistryRoutes />
            </ModelRegistrySelectorContextProvider>
          </NotificationContextProvider>
        </BrowserStorageContextProvider>
    </ModularArchContextProvider>
  );
};

export default ModelRegistryWrapper;
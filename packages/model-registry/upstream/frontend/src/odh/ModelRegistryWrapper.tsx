import React from 'react';
import {
  BrowserStorageContextProvider,
  NotificationContextProvider,
  ModularArchContextProvider,
  ModularArchConfig,
  DeploymentMode,
  useSettings,
} from 'mod-arch-core';
import { ThemeProvider, Theme } from 'mod-arch-kubeflow';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import ModelRegistryRoutes from '~/app/pages/modelRegistry/ModelRegistryRoutes';
import { ModelRegistrySelectorContextProvider } from '~/app/context/ModelRegistrySelectorContext';
import { AppContext } from '~/app/context/AppContext';
import { Bullseye } from '@patternfly/react-core';
import useFetchDscStatus from '@odh-dashboard/internal/concepts/areas/useFetchDscStatus';

const ModelRegistryWrapperContent: React.FC = () => {
  const {
    configSettings,
    userSettings,
    loaded,
    loadError,
  } = useSettings();
  if (loadError) {
    return <div>Error: {loadError.message}</div>;
  }
  if (!loaded) {
    return <Bullseye>Loading...</Bullseye>;
  }
  return configSettings && userSettings ? (
    <AppContext.Provider
      value={{
        config: configSettings,
        user: userSettings,
      }}
    >
        <ThemeProvider theme={Theme.Patternfly}>
          <BrowserStorageContextProvider>
            <NotificationContextProvider>
              <ModelRegistrySelectorContextProvider>
                <ModelRegistryRoutes />
              </ModelRegistrySelectorContextProvider>
            </NotificationContextProvider>
          </BrowserStorageContextProvider>
        </ThemeProvider>
      </AppContext.Provider>
  ) : null;
};

const ModelRegistryWrapper: React.FC = () => {
  const [dscStatus] = useFetchDscStatus();
  const modularArchConfig: ModularArchConfig = {
    deploymentMode: DeploymentMode.Federated,
    URL_PREFIX,
    BFF_API_VERSION,
    mandatoryNamespace: dscStatus?.components?.modelregistry?.registriesNamespace,
  };
  return (
    <ModularArchContextProvider config={modularArchConfig}>
      <ModelRegistryWrapperContent />
    </ModularArchContextProvider>
  );
};
export default ModelRegistryWrapper;

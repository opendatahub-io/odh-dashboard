import React from 'react';
import {
  ModularArchConfig,
  DeploymentMode,
  ModularArchContextProvider,
  NotificationContextProvider,
  BrowserStorageContextProvider,
  useSettings,
} from 'mod-arch-core';
import { Bullseye } from '@patternfly/react-core';
import { URL_PREFIX } from '~/app/utilities/const';
import AllExternalModelsPage from '~/app/pages/external-models/AllExternalModelsPage';
import ToastNotifications from '~/app/components/ToastNotifications';
import { AppContext } from '~/app/context/AppContext';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

const ExternalModelsWrapperContent: React.FC = () => {
  const { configSettings, userSettings, loaded, loadError } = useSettings();
  const contextValue = React.useMemo(
    () => (configSettings && userSettings ? { config: configSettings, user: userSettings } : null),
    [configSettings, userSettings],
  );
  if (loadError) {
    return <div>Unable to load settings. Please reload the page.</div>;
  }
  if (!loaded) {
    return <Bullseye>Loading...</Bullseye>;
  }
  if (!contextValue) {
    return <div>Unable to load settings. Please reload the page.</div>;
  }
  return (
    <AppContext.Provider value={contextValue}>
      <BrowserStorageContextProvider>
        <NotificationContextProvider>
          <ToastNotifications />
          <AllExternalModelsPage />
        </NotificationContextProvider>
      </BrowserStorageContextProvider>
    </AppContext.Provider>
  );
};

const ExternalModelsWrapper: React.FC = () => (
  <ModularArchContextProvider config={modularArchConfig}>
    <ExternalModelsWrapperContent />
  </ModularArchContextProvider>
);

export default ExternalModelsWrapper;

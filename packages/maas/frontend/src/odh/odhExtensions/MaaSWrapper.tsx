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
import AppRoutes from '~/app/AppRoutes';
import { AppContext } from '~/app/context/AppContext';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};
const MaasWrapperContent: React.FC = () => {
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
          <AppRoutes />
        </NotificationContextProvider>
      </BrowserStorageContextProvider>
    </AppContext.Provider>
  );
};
const MaasWrapper: React.FC = () => (
  <ModularArchContextProvider config={modularArchConfig}>
    <MaasWrapperContent />
  </ModularArchContextProvider>
);
export default MaasWrapper;

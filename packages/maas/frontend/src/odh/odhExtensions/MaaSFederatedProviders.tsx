import React from 'react';
import {
  ModularArchConfig,
  DeploymentMode,
  ModularArchContextProvider,
  NotificationContextProvider,
  BrowserStorageContextProvider,
  useSettings,
} from 'mod-arch-core';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { URL_PREFIX } from '~/app/utilities/const';
import ToastNotifications from '~/app/components/ToastNotifications';
import { AppContext } from '~/app/context/AppContext';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

type MaaSFederatedProvidersProps = {
  children: React.ReactNode;
};

const MaaSFederatedProvidersContent: React.FC<MaaSFederatedProvidersProps> = ({ children }) => {
  const { configSettings, userSettings, loaded, loadError } = useSettings();
  const contextValue = React.useMemo(
    () => (configSettings && userSettings ? { config: configSettings, user: userSettings } : null),
    [configSettings, userSettings],
  );

  if (loadError) {
    return <div>Unable to load settings. Please reload the page.</div>;
  }
  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }
  if (!contextValue) {
    return <div>Unable to load settings. Please reload the page.</div>;
  }

  return (
    <AppContext.Provider value={contextValue}>
      <BrowserStorageContextProvider>
        <NotificationContextProvider>
          <ToastNotifications />
          {children}
        </NotificationContextProvider>
      </BrowserStorageContextProvider>
    </AppContext.Provider>
  );
};

const MaaSFederatedProviders: React.FC<MaaSFederatedProvidersProps> = ({ children }) => (
  <ModularArchContextProvider config={modularArchConfig}>
    <MaaSFederatedProvidersContent>{children}</MaaSFederatedProvidersContent>
  </ModularArchContextProvider>
);

export default MaaSFederatedProviders;

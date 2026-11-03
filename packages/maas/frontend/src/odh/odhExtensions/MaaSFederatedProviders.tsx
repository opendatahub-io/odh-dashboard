import React from 'react';
import {
  ModularArchConfig,
  DeploymentMode,
  ModularArchContextProvider,
  NotificationContextProvider,
  BrowserStorageContextProvider,
  useSettings,
  type ConfigSettings,
  type UserSettings,
} from 'mod-arch-core';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { API_URL_PREFIX } from '~/app/utilities/const';
import ToastNotifications from '~/app/components/ToastNotifications';
import { AppContext } from '~/app/context/AppContext';
import { useMaaSSettings } from '~/app/hooks/useMaaSSettings';
import { isMaaSPortalHost } from '~/app/utilities/maasGovernanceNavigation';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX: API_URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

type MaaSFederatedProvidersProps = {
  children: React.ReactNode;
};

type SettingsContentProps = MaaSFederatedProvidersProps & {
  configSettings: ConfigSettings | null;
  userSettings: UserSettings | null;
  loaded: boolean;
  loadError: Error | undefined;
};

const MaaSFederatedProvidersContent: React.FC<SettingsContentProps> = ({
  children,
  configSettings,
  userSettings,
  loaded,
  loadError,
}) => {
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

const MaaSSettingsLoader: React.FC<MaaSFederatedProvidersProps> = ({ children }) => {
  const settings = useMaaSSettings();
  return <MaaSFederatedProvidersContent {...settings}>{children}</MaaSFederatedProvidersContent>;
};

const LegacySettingsLoader: React.FC<MaaSFederatedProvidersProps> = ({ children }) => {
  const settings = useSettings();
  return <MaaSFederatedProvidersContent {...settings}>{children}</MaaSFederatedProvidersContent>;
};

const MaaSFederatedProviders: React.FC<MaaSFederatedProvidersProps> = ({ children }) => {
  const SettingsLoader = isMaaSPortalHost() ? MaaSSettingsLoader : LegacySettingsLoader;

  return (
    <ModularArchContextProvider config={modularArchConfig}>
      <SettingsLoader>{children}</SettingsLoader>
    </ModularArchContextProvider>
  );
};

export default MaaSFederatedProviders;

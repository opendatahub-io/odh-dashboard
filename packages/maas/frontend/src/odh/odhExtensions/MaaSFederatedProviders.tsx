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
import { useGridSettings } from '~/app/hooks/useGridSettings';
import { GRID_MANDATORY_NAMESPACE, useGridFeatureFlag } from '~/app/utilities/gridFeatureFlag';

const getModularArchConfig = (isGridEnabled: boolean): ModularArchConfig => ({
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX: API_URL_PREFIX,
  BFF_API_VERSION: 'v1',
  mandatoryNamespace: isGridEnabled ? GRID_MANDATORY_NAMESPACE : undefined,
});

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

const LegacySettingsLoader: React.FC<MaaSFederatedProvidersProps> = ({ children }) => {
  const settings = useSettings();
  return <MaaSFederatedProvidersContent {...settings}>{children}</MaaSFederatedProvidersContent>;
};

const GridSettingsLoader: React.FC<MaaSFederatedProvidersProps> = ({ children }) => {
  const settings = useGridSettings();
  return <MaaSFederatedProvidersContent {...settings}>{children}</MaaSFederatedProvidersContent>;
};

const MaaSFederatedProviders: React.FC<MaaSFederatedProvidersProps> = ({ children }) => {
  const isGridEnabled = useGridFeatureFlag();
  const modularArchConfig = React.useMemo(
    () => getModularArchConfig(isGridEnabled),
    [isGridEnabled],
  );

  return (
    <ModularArchContextProvider config={modularArchConfig}>
      {isGridEnabled ? (
        <GridSettingsLoader>{children}</GridSettingsLoader>
      ) : (
        <LegacySettingsLoader>{children}</LegacySettingsLoader>
      )}
    </ModularArchContextProvider>
  );
};

export default MaaSFederatedProviders;

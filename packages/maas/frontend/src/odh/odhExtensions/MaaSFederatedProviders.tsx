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
import { Alert, Bullseye, Button, PageSection, Spinner } from '@patternfly/react-core';
import { API_URL_PREFIX, MAAS_MANDATORY_NAMESPACE } from '~/app/utilities/const';
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

// The settings hooks load once and can't refetch, so Refresh reloads the page, as the message says.
// Same pattern as the Model endpoints page's load error.
const SettingsLoadError: React.FC = () => (
  <PageSection>
    <Alert isInline variant="danger" title="Unable to load page" data-testid="maas-settings-error">
      <p>Refresh the page, or try again later.</p>
      <Button
        variant="link"
        onClick={() => window.location.reload()}
        data-testid="maas-settings-refresh"
      >
        Refresh
      </Button>
    </Alert>
  </PageSection>
);

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
    return <SettingsLoadError />;
  }
  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }
  if (!contextValue) {
    return <SettingsLoadError />;
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
  const isPortalHost = isMaaSPortalHost();
  const SettingsLoader = isPortalHost ? MaaSSettingsLoader : LegacySettingsLoader;
  // TODO: Remove this portal-specific namespace workaround once the mandatory namespace hack is no longer needed.
  const config = isPortalHost
    ? { ...modularArchConfig, mandatoryNamespace: MAAS_MANDATORY_NAMESPACE }
    : modularArchConfig;

  return (
    <ModularArchContextProvider config={config}>
      <SettingsLoader>{children}</SettingsLoader>
    </ModularArchContextProvider>
  );
};

export default MaaSFederatedProviders;

import * as React from 'react';
import '@patternfly/react-core/dist/styles/base.css';
import './app.css';
import {
  Alert,
  Bullseye,
  Button,
  Page,
  PageSection,
  PageSidebar,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import {
  ConfigSettings,
  DeploymentMode,
  UserSettings,
  logout,
  useModularArchContext,
  useSettings,
} from 'mod-arch-core';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import AppRoutes from '~/app/AppRoutes';
import { AppContext } from '~/app/context/AppContext';
import { useGridSettings } from '~/app/hooks/useGridSettings';
import { isGridFeatureFlagEnabledFromDevStorage } from '~/app/utilities/gridFeatureFlag';

type AppShellProps = {
  configSettings: ConfigSettings | null;
  userSettings: UserSettings | null;
  loaded: boolean;
  loadError: Error | undefined;
  showLogoutAction?: boolean;
};

const AppShell: React.FC<AppShellProps> = ({
  configSettings,
  userSettings,
  loaded,
  loadError,
  showLogoutAction,
}) => {
  const { config } = useModularArchContext();
  const { deploymentMode } = config;
  const isStandalone = deploymentMode === DeploymentMode.Standalone;

  const contextValue = React.useMemo(
    () =>
      configSettings && userSettings
        ? {
            config: configSettings,
            user: userSettings,
          }
        : null,
    [configSettings, userSettings],
  );

  const sidebar = <PageSidebar isSidebarOpen={false} />;

  if (loadError) {
    return (
      <Page sidebar={sidebar}>
        <PageSection>
          <Stack hasGutter>
            <StackItem>
              <Alert variant="danger" isInline title="General loading error">
                <p>{loadError.message || 'Unknown error occurred during startup'}</p>
                {showLogoutAction ? (
                  <p>Logging out and logging back in may solve the issue</p>
                ) : null}
              </Alert>
            </StackItem>
            {showLogoutAction ? (
              <StackItem>
                <Button
                  variant="secondary"
                  onClick={() => logout().then(() => window.location.reload())}
                >
                  Logout
                </Button>
              </StackItem>
            ) : null}
          </Stack>
        </PageSection>
      </Page>
    );
  }

  return !loaded || !contextValue ? (
    <Bullseye>
      <Spinner />
    </Bullseye>
  ) : (
    <AppContext.Provider value={contextValue}>
      <Page mainContainerId="primary-app-container" isManagedSidebar={isStandalone}>
        <AppRoutes />
      </Page>
    </AppContext.Provider>
  );
};

const AppContent: React.FC = () => {
  const {
    configSettings,
    userSettings,
    loaded: configLoaded,
    loadError: configError,
  } = useSettings();

  const { namespacesLoaded, namespacesLoadError, initializationError } =
    useNamespaceSelectorWithPersistence();

  return (
    <AppShell
      configSettings={configSettings}
      userSettings={userSettings}
      loaded={configLoaded && namespacesLoaded}
      loadError={configError || namespacesLoadError || initializationError}
      showLogoutAction
    />
  );
};

const GridAppContent: React.FC = () => {
  const { configSettings, userSettings, loaded, loadError } = useGridSettings();

  return (
    <AppShell
      configSettings={configSettings}
      userSettings={userSettings}
      loaded={loaded}
      loadError={loadError}
    />
  );
};

const App: React.FC = () =>
  isGridFeatureFlagEnabledFromDevStorage() ? <GridAppContent /> : <AppContent />;

export default App;

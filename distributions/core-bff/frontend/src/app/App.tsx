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
  DeploymentMode,
  logout,
  useModularArchContext,
  useNamespaceSelector,
  useSettings,
} from 'mod-arch-core';
import AppRoutes from '~/app/AppRoutes';
import { AppContext } from '~/app/context/AppContext';
import { BffStatusProvider } from '~/app/context/BffStatusContext';
import { NamespaceProvider } from '~/app/context/NamespaceContext';

const App: React.FC = () => {
  const {
    configSettings,
    userSettings,
    loaded: configLoaded,
    loadError: configError,
  } = useSettings();

  const { namespacesLoaded, namespacesLoadError, initializationError } = useNamespaceSelector();

  const { config } = useModularArchContext();
  const { deploymentMode } = config;
  const isStandalone = deploymentMode === DeploymentMode.Standalone;

  const contextValue = React.useMemo(
    () =>
      configSettings && userSettings
        ? {
            config: configSettings!,
            user: userSettings!,
          }
        : null,
    [configSettings, userSettings],
  );

  const error = configError || namespacesLoadError || initializationError;

  const sidebar = <PageSidebar isSidebarOpen={false} />;

  // We lack the critical data to startup the app
  if (error) {
    // There was an error fetching critical data
    return (
      <Page sidebar={sidebar}>
        <PageSection>
          <Stack hasGutter>
            <StackItem>
              <Alert variant="danger" isInline title="General loading error">
                <p>
                  {configError?.message ||
                    namespacesLoadError?.message ||
                    initializationError?.message ||
                    'Unknown error occurred during startup'}
                </p>
                <p>Logging out and logging back in may solve the issue</p>
              </Alert>
            </StackItem>
            <StackItem>
              <Button
                variant="secondary"
                onClick={() => logout().then(() => window.location.reload())}
              >
                Logout
              </Button>
            </StackItem>
          </Stack>
        </PageSection>
      </Page>
    );
  }

  // Waiting on the API to finish
  const loading =
    !configLoaded || !userSettings || !configSettings || !contextValue || !namespacesLoaded;

  return loading ? (
    <Bullseye>
      <Spinner />
    </Bullseye>
  ) : (
    <AppContext.Provider value={contextValue}>
      <BffStatusProvider>
        <NamespaceProvider>
          <Page mainContainerId="primary-app-container" isManagedSidebar={isStandalone}>
            <AppRoutes />
          </Page>
        </NamespaceProvider>
      </BffStatusProvider>
    </AppContext.Provider>
  );
};

export default App;

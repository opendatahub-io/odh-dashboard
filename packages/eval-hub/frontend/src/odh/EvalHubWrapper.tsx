import React from 'react';
import {
  ModularArchConfig,
  DeploymentMode,
  ModularArchContextProvider,
  NotificationContextProvider,
  BrowserStorageContextProvider,
  useSettings,
} from 'mod-arch-core';
import { Alert, Bullseye, Spinner } from '@patternfly/react-core';
import { URL_PREFIX } from '~/app/utilities/const';
import { AppContext } from '~/app/context/AppContext';
import AppRoutes from '~/app/AppRoutes';
import { registerMlflowEmbeddedRemote } from './registerMlflowEmbeddedRemote';

registerMlflowEmbeddedRemote();

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

const EvalHubWrapperContent: React.FC = () => {
  const { configSettings, userSettings, loaded, loadError } = useSettings();

  const contextValue = React.useMemo(
    () => (configSettings && userSettings ? { config: configSettings, user: userSettings } : null),
    [configSettings, userSettings],
  );

  if (loadError) {
    return (
      <Bullseye>
        <Alert
          variant="danger"
          isInline
          isExpandable
          title="Unable to load settings. Please refresh the page or contact your administrator."
        >
          {loadError.message}
        </Alert>
      </Bullseye>
    );
  }
  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }
  if (!contextValue) {
    return (
      <Bullseye>
        <Alert variant="danger" isInline title="Invalid settings response">
          Required settings were not returned. Please refresh the page or contact your
          administrator.
        </Alert>
      </Bullseye>
    );
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

const EvalHubWrapper: React.FC = () => (
  <ModularArchContextProvider config={modularArchConfig}>
    <EvalHubWrapperContent />
  </ModularArchContextProvider>
);

export default EvalHubWrapper;

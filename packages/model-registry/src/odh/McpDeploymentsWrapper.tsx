import React from 'react';
import { Bullseye } from '@patternfly/react-core';
import {
  BrowserStorageContextProvider,
  NotificationContextProvider,
  ModularArchContextProvider,
  ModularArchConfig,
  DeploymentMode,
  useSettings,
} from 'mod-arch-core';
import { ThemeProvider, Theme } from 'mod-arch-kubeflow';
import { BFF_API_VERSION, URL_PREFIX } from '../../upstream/frontend/src/app/utilities/const';
import { AppContext } from '../../upstream/frontend/src/app/context/AppContext';
import McpDeploymentsRoutes from '../pages/mcpDeployments/McpDeploymentsRoutes';
import NotificationListener from '../../upstream/frontend/src/odh/components/NotificationListener';

const McpDeploymentsWrapperContent: React.FC = () => {
  const { configSettings, userSettings, loaded, loadError } = useSettings();
  const contextValue = React.useMemo(
    () =>
      configSettings && userSettings ? { config: configSettings, user: userSettings } : undefined,
    [configSettings, userSettings],
  );

  if (loadError) {
    return <div>Error: {loadError.message}</div>;
  }
  if (!loaded) {
    return <Bullseye>Loading...</Bullseye>;
  }

  return contextValue ? (
    <AppContext.Provider value={contextValue}>
      <ThemeProvider theme={Theme.Patternfly}>
        <BrowserStorageContextProvider>
          <NotificationContextProvider>
            <NotificationListener>
              <McpDeploymentsRoutes />
            </NotificationListener>
          </NotificationContextProvider>
        </BrowserStorageContextProvider>
      </ThemeProvider>
    </AppContext.Provider>
  ) : null;
};

const McpDeploymentsWrapper: React.FC = () => {
  const modularArchConfig: ModularArchConfig = {
    deploymentMode: DeploymentMode.Federated,
    URL_PREFIX,
    BFF_API_VERSION,
  };
  return (
    <ModularArchContextProvider config={modularArchConfig}>
      <McpDeploymentsWrapperContent />
    </ModularArchContextProvider>
  );
};
export default McpDeploymentsWrapper;

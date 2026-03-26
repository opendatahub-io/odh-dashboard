import React from 'react';
import {
  BrowserStorageContextProvider,
  NotificationContextProvider,
  ModularArchContextProvider,
  ModularArchConfig,
  DeploymentMode,
  useSettings,
} from 'mod-arch-core';
import { ThemeProvider, Theme } from 'mod-arch-kubeflow';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { AppContext } from '~/app/context/AppContext';
import McpDeploymentsRoutes from '~/app/pages/mcpDeployments/McpDeploymentsRoutes';
import { Bullseye } from '@patternfly/react-core';
import NotificationListener from '~/odh/components/NotificationListener';
import OdhDevFeatureFlagOverridesProvider from '~/odh/components/OdhDevFeatureFlagOverridesProvider';

const McpDeploymentsWrapperContent: React.FC = () => {
  const { configSettings, userSettings, loaded, loadError } = useSettings();
  if (loadError) {
    return <div>Error: {loadError.message}</div>;
  }
  if (!loaded) {
    return <Bullseye>Loading...</Bullseye>;
  }
  return configSettings && userSettings ? (
    <AppContext.Provider
      value={{
        config: configSettings,
        user: userSettings,
      }}
    >
      <ThemeProvider theme={Theme.Patternfly}>
        <BrowserStorageContextProvider>
          <OdhDevFeatureFlagOverridesProvider crdOverrides={{}}>
            <NotificationContextProvider>
              <NotificationListener>
                <McpDeploymentsRoutes />
              </NotificationListener>
            </NotificationContextProvider>
          </OdhDevFeatureFlagOverridesProvider>
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

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
import { Bullseye } from '@patternfly/react-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { AppContext } from '~/app/context/AppContext';
import McpDeploymentsRoutes from '~/odh/pages/mcpDeployments/McpDeploymentsRoutes';
import NotificationListener from '~/odh/components/NotificationListener';
import OdhDevFeatureFlagOverridesProvider from '~/odh/components/OdhDevFeatureFlagOverridesProvider';
import ProjectsBridgeProviderWrapper from '~/odh/components/ProjectsBridgeProviderWrapper';

const McpDeploymentsWrapperContent: React.FC = () => {
  const { configSettings, userSettings, loaded, loadError } = useSettings();
  const appContextValue = React.useMemo(
    () => (configSettings && userSettings ? { config: configSettings, user: userSettings } : null),
    [configSettings, userSettings],
  );
  if (loadError) {
    return <div>Error: {loadError.message}</div>;
  }
  if (!loaded) {
    return <Bullseye>Loading...</Bullseye>;
  }
  return appContextValue ? (
    <AppContext.Provider value={appContextValue}>
      <ThemeProvider theme={Theme.Patternfly}>
        <BrowserStorageContextProvider>
          <OdhDevFeatureFlagOverridesProvider crdOverrides={{}}>
            <NotificationContextProvider>
              <NotificationListener>
                <ProjectsBridgeProviderWrapper>
                  <McpDeploymentsRoutes />
                </ProjectsBridgeProviderWrapper>
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

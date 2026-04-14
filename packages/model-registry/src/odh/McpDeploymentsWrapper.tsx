import React from 'react';
import { Bullseye } from '@patternfly/react-core';
import {
  BrowserStorageContextProvider,
  ModularArchContextProvider,
  ModularArchConfig,
  DeploymentMode,
  useSettings,
} from 'mod-arch-core';
import { ThemeProvider, Theme } from 'mod-arch-kubeflow';
import { BFF_API_VERSION, URL_PREFIX } from '../../upstream/frontend/src/app/utilities/const';
import McpDeploymentsRoutes from '../pages/mcpDeployments/McpDeploymentsRoutes';

const McpDeploymentsWrapperContent: React.FC = () => {
  const { loaded, loadError } = useSettings();

  if (loadError) {
    return <div>Error: {loadError.message}</div>;
  }
  if (!loaded) {
    return <Bullseye>Loading...</Bullseye>;
  }

  return (
    <ThemeProvider theme={Theme.Patternfly}>
      <BrowserStorageContextProvider>
        <McpDeploymentsRoutes />
      </BrowserStorageContextProvider>
    </ThemeProvider>
  );
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

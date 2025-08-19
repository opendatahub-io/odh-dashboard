import React from 'react';
import { ModularArchConfig, DeploymentMode, ModularArchContextProvider } from 'mod-arch-core';
import { Theme, ThemeProvider } from 'mod-arch-kubeflow';
import { AppRoutes } from '~/app/AppRoutes';
import { URL_PREFIX } from '~/app/utilities/const';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

const LlamaStackWrapper: React.FC = () => (
  <ModularArchContextProvider config={modularArchConfig}>
    <ThemeProvider theme={Theme.Patternfly}>
      <AppRoutes />
    </ThemeProvider>
  </ModularArchContextProvider>
);

export default LlamaStackWrapper;

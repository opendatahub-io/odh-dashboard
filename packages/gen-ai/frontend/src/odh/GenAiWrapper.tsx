import React from 'react';
import { ModularArchConfig, DeploymentMode, ModularArchContextProvider } from 'mod-arch-core';
import { AppRoutes } from '~/app/AppRoutes';
import { URL_PREFIX } from '~/app/utilities/const';
import { UserContextProvider } from '~/app/context/UserContext';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

const GenAiWrapper: React.FC = () => (
  <ModularArchContextProvider config={modularArchConfig}>
    <UserContextProvider>
      <AppRoutes />
    </UserContextProvider>
  </ModularArchContextProvider>
);

export default GenAiWrapper;

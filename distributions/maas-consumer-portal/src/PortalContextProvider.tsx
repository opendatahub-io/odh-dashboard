import React from 'react';
import { DeploymentMode, ModularArchContextProvider, type ModularArchConfig } from 'mod-arch-core';
import PortalAreaContextProvider from './PortalAreaContextProvider';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Standalone,
  URL_PREFIX: '/maas',
  BFF_API_VERSION: 'v1',
};

const PortalContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ModularArchContextProvider config={modularArchConfig}>
    <PortalAreaContextProvider>{children}</PortalAreaContextProvider>
  </ModularArchContextProvider>
);

export default PortalContextProvider;

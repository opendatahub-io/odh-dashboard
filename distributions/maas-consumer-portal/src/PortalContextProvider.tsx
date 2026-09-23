import React from 'react';
import { DeploymentMode, ModularArchContextProvider, type ModularArchConfig } from 'mod-arch-core';
import MaaSAuthzProvider from './MaaSAuthzProvider';
import PortalAreaContextProvider from './PortalAreaContextProvider';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Standalone,
  URL_PREFIX: `${process.env.BASE_PATH || ''}/maas`,
  BFF_API_VERSION: 'v1',
};

const PortalContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ModularArchContextProvider config={modularArchConfig}>
    <MaaSAuthzProvider>
      <PortalAreaContextProvider>{children}</PortalAreaContextProvider>
    </MaaSAuthzProvider>
  </ModularArchContextProvider>
);

export default PortalContextProvider;

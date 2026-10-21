import React from 'react';
import { DeploymentMode, ModularArchContextProvider, type ModularArchConfig } from 'mod-arch-core';
import HostApiProvider from './HostApiProvider';
import MaaSAuthzProvider from './MaaSAuthzProvider';
import PortalAreaContextProvider from './PortalAreaContextProvider';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Standalone,
  URL_PREFIX: `${process.env.BASE_PATH || ''}/maas`,
  BFF_API_VERSION: 'v1',
};

const gridModularArchConfig: ModularArchConfig = {
  ...modularArchConfig,
  // TODO: Remove this placeholder when mod-arch-core supports a namespace-free grid setup.
  mandatoryNamespace: '__maas_grid__',
};

const PortalContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ModularArchContextProvider
    config={
      window.__MAAS_CONSUMER_PORTAL_GRID__ === true ? gridModularArchConfig : modularArchConfig
    }
  >
    <HostApiProvider>
      <MaaSAuthzProvider>
        <PortalAreaContextProvider>{children}</PortalAreaContextProvider>
      </MaaSAuthzProvider>
    </HostApiProvider>
  </ModularArchContextProvider>
);

export default PortalContextProvider;

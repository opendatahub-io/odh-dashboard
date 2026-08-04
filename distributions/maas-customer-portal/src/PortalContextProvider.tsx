import React from 'react';
import { usePluginStore } from '@openshift/dynamic-plugin-sdk';
import {
  DeploymentMode,
  ModularArchContextProvider,
  useSettings,
  type ModularArchConfig,
} from 'mod-arch-core';

const ADMIN_USER_FLAG = 'ADMIN_USER';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Standalone,
  URL_PREFIX: '/maas',
  BFF_API_VERSION: 'v1',
};

const FlagsSync: React.FC = () => {
  const pluginStore = usePluginStore();
  const { userSettings } = useSettings();

  React.useEffect(() => {
    pluginStore.setFeatureFlags({
      [ADMIN_USER_FLAG]: !!userSettings?.clusterAdmin,
    });
  }, [pluginStore, userSettings?.clusterAdmin]);

  return null;
};

const PortalContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ModularArchContextProvider config={modularArchConfig}>
    <FlagsSync />
    {children}
  </ModularArchContextProvider>
);

export default PortalContextProvider;

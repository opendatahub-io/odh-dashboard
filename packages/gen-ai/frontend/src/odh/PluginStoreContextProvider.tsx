import * as React from 'react';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
import extensions from './extensions';

const PLUGIN_GEN_AI = 'plugin-gen-ai';
const MODEL_AS_SERVICE = 'model-as-service';

export const PluginStoreContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const store = React.useMemo(() => {
    const pluginStore = new PluginStore({ 'gen-ai': extensions });
    // Enable feature flags for standalone mode so extensions with these flags are active
    pluginStore.setFeatureFlags({
      [PLUGIN_GEN_AI]: true,
      [MODEL_AS_SERVICE]: true,
    });
    return pluginStore;
  }, []);

  return <PluginStoreProvider store={store}>{children}</PluginStoreProvider>;
};

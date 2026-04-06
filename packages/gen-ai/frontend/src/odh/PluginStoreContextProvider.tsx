import * as React from 'react';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
import extensions, {
  AI_ASSET_CUSTOM_ENDPOINTS,
  EXTERNAL_VECTOR_STORES,
  GUARDRAILS,
  MODEL_AS_SERVICE,
  MODEL_AS_SERVICE_CAMEL,
  PLUGIN_GEN_AI,
  PROMPT_MANAGEMENT,
} from './extensions';

export const PluginStoreContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const store = React.useMemo(() => {
    const pluginStore = new PluginStore({ 'gen-ai': extensions });
    const flags: Record<string, boolean> = {
      [PLUGIN_GEN_AI]: true,
      [MODEL_AS_SERVICE]: true,
      [MODEL_AS_SERVICE_CAMEL]: true,
      [GUARDRAILS]: true,
      [PROMPT_MANAGEMENT]: true,
      [EXTERNAL_VECTOR_STORES]: true,
      [AI_ASSET_CUSTOM_ENDPOINTS]: true,
    };

    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of params.entries()) {
      if (key in flags) {
        flags[key] = value !== 'false';
      }
    }

    pluginStore.setFeatureFlags(flags);
    return pluginStore;
  }, []);

  return <PluginStoreProvider store={store}>{children}</PluginStoreProvider>;
};

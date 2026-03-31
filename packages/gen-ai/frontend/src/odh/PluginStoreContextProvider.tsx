import * as React from 'react';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
import extensions from './extensions';

const PLUGIN_GEN_AI = 'plugin-gen-ai';
const MODEL_AS_SERVICE = 'model-as-service';
const MODEL_AS_SERVICE_CAMEL = 'modelAsService';
const GUARDRAILS = 'guardrails';
const PROMPT_MANAGEMENT = 'promptManagement';

export const PluginStoreContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const store = React.useMemo(() => {
    const pluginStore = new PluginStore({ 'gen-ai': extensions });
    const flags: Record<string, boolean> = {
      [PLUGIN_GEN_AI]: true,
      [MODEL_AS_SERVICE]: true,
      [MODEL_AS_SERVICE_CAMEL]: true,
      [GUARDRAILS]: true,
      [PROMPT_MANAGEMENT]: true,
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

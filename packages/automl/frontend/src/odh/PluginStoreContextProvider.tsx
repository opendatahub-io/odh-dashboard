import * as React from 'react';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
import type { ConnectionTypesServiceExtension } from '@odh-dashboard/plugin-core/extension-points';

// Standalone/mock mode has no host dashboard to supply plugin extensions (e.g. the
// `app.connection-types/service` extension backing `useWatchConnectionTypes`), so hooks relying
// on `useResolvedExtensions` would otherwise throw "usePluginStore hook called outside a
// PluginStoreProvider". Registering an empty connection-types service here keeps those hooks
// working (returning no connection types) instead of crashing the app.
const extensions: ConnectionTypesServiceExtension[] = [
  {
    type: 'app.connection-types/service',
    properties: {
      fetchConnectionTypes: () => Promise.resolve(() => Promise.resolve([])),
      fetchConnections: () => Promise.resolve(() => Promise.resolve([])),
    },
  },
];

export const PluginStoreContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const store = React.useMemo(() => new PluginStore({ automl: extensions }), []);

  return <PluginStoreProvider store={store}>{children}</PluginStoreProvider>;
};

// TODO: Dedup — this is a copy of frontend/src/plugins/ExtensibilityContext.tsx.
// Consider moving to plugin-core as a shared provider.
import * as React from 'react';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
import { useAppExtensions } from './useAppExtensions';

export const ExtensibilityContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [appExtensions, loaded] = useAppExtensions();
  const store = React.useMemo(
    () => (loaded ? new PluginStore(appExtensions) : null),
    [appExtensions, loaded],
  );
  return store ? <PluginStoreProvider store={store}>{children}</PluginStoreProvider> : null;
};

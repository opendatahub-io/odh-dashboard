import * as React from 'react';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
import { useAppExtensions } from './useAppExtensions';

export const ExtensibilityContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [appExtensions] = useAppExtensions();
  const store = React.useMemo(() => new PluginStore(appExtensions), [appExtensions]);
  return <PluginStoreProvider store={store}>{children}</PluginStoreProvider>;
};

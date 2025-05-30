import * as React from 'react';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
import extensionDeclarations from '#~/plugins/extensions';

export const ExtensibilityContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  // create the plugin store
  const store = React.useMemo(() => new PluginStore(extensionDeclarations), []);
  return <PluginStoreProvider store={store}>{children}</PluginStoreProvider>;
};

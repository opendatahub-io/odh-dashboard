import * as React from 'react';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { type AppExtensions, useAppExtensions } from './useAppExtensions';
import { PluginStore } from '../core/plugin-store';

type ExtensibilityContextProviderProps = {
  /** Extensions bundled into the host. Pass a stable reference. */
  staticExtensions?: AppExtensions;
  /** JSON array of Module Federation remotes whose extensions are loaded at runtime. */
  mfRemotes?: string | null;
  /** Rendered until all extensions are loaded. Defaults to nothing. */
  loadingFallback?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Host-side provider that builds the PluginStore from the host's static and federated
 * extensions. The React context itself belongs to `@openshift/dynamic-plugin-sdk`, which is
 * a Module Federation singleton, so hosts and remotes read the same store.
 */
export const ExtensibilityContextProvider: React.FC<ExtensibilityContextProviderProps> = ({
  staticExtensions,
  mfRemotes,
  loadingFallback = null,
  children,
}) => {
  const [appExtensions, loaded] = useAppExtensions(staticExtensions, mfRemotes);
  const store = React.useMemo(
    () => (loaded ? new PluginStore(appExtensions) : null),
    [appExtensions, loaded],
  );
  if (!store) {
    return loadingFallback;
  }
  return <PluginStoreProvider store={store}>{children}</PluginStoreProvider>;
};

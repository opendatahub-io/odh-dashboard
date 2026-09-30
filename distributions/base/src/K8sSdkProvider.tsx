import * as React from 'react';
import { PluginStore as SdkPluginStore, PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { AppInitSDK, isUtilsConfigSet } from '@openshift/dynamic-plugin-sdk-utils';
import { Bullseye, Spinner } from '@patternfly/react-core';
import type { PluginStore } from '@odh-dashboard/plugin-core';

type SDKConfigurations = React.ComponentProps<typeof AppInitSDK>['configurations'];

const apiDiscovery: NonNullable<SDKConfigurations['apiDiscovery']> = () => null;

const getWsAppSettings = (basePath: string): ReturnType<SDKConfigurations['wsAppSettings']> =>
  Promise.resolve({
    host: `${window.location.protocol.replace(/^http/i, 'ws')}//${
      window.location.host
    }${basePath}/wss/k8s`,
    urlAugment: (url: string) => {
      const [path, query] = url.split('?');
      const queryParams = new URLSearchParams(query);
      if (!queryParams.has('watch')) {
        queryParams.set('watch', 'true');
      }
      return `${path}?${queryParams.toString()}`;
    },
    subProtocols: [],
  });

type K8sSdkProviderProps = {
  store: PluginStore;
  appFetch: (url: string, options?: RequestInit) => Promise<Response>;
  /** Browser-visible mount point for the distribution's Kubernetes WebSocket proxy. */
  basePath?: string;
  children: React.ReactNode;
};

/** Initializes the SDK Kubernetes client using the distribution's Core BFF transport. */
export const K8sSdkProvider: React.FC<K8sSdkProviderProps> = ({
  store,
  appFetch,
  basePath = '',
  children,
}) => {
  const [ready, setReady] = React.useState(isUtilsConfigSet);
  const sdkPluginStore = React.useMemo(() => new SdkPluginStore(), []);
  const wsAppSettings = React.useCallback(() => getWsAppSettings(basePath), [basePath]);

  React.useEffect(() => {
    if (ready) {
      return undefined;
    }
    const intervalId = window.setInterval(() => {
      if (isUtilsConfigSet()) {
        setReady(true);
        window.clearInterval(intervalId);
      }
    }, 100);
    return () => window.clearInterval(intervalId);
  }, [ready]);

  return (
    // AppInitSDK's published props omit React children.
    // @ts-expect-error AppInitSDK accepts children at runtime.
    <AppInitSDK
      configurations={{
        appFetch,
        apiDiscovery,
        pluginStore: sdkPluginStore,
        wsAppSettings,
      }}
    >
      <PluginStoreProvider store={store}>
        {ready ? (
          children
        ) : (
          <Bullseye>
            <Spinner />
          </Bullseye>
        )}
      </PluginStoreProvider>
    </AppInitSDK>
  );
};

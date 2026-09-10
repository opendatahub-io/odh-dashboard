import * as React from 'react';
import type { PluginStore } from '@odh-dashboard/plugin-core';
import { PluginStore as SdkPluginStore, PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { AppInitSDK, isUtilsConfigSet } from '@openshift/dynamic-plugin-sdk-utils';
import { Bullseye, Spinner } from '@patternfly/react-core';

const sdkConfig: Omit<React.ComponentProps<typeof AppInitSDK>['configurations'], 'pluginStore'> = {
  appFetch: (url, options) => fetch(`/api/k8s${url}`, options),
  // KServe supplies static models to its watch hooks, so discovery is unnecessary.
  apiDiscovery: () => null,
  wsAppSettings: () =>
    Promise.resolve({
      host: `${window.location.protocol.replace(/^http/i, 'ws')}//${window.location.host}/wss/k8s`,
      urlAugment: (url) => {
        const [path, query] = url.split('?');
        const queryParams = new URLSearchParams(query);
        if (!queryParams.has('watch')) {
          queryParams.set('watch', 'true');
        }
        return `${path}?${queryParams.toString()}`;
      },
      subProtocols: [],
    }),
};

type K8sSdkProviderProps = {
  store: PluginStore;
  children: React.ReactNode;
};

/** Initializes the SDK Redux and Kubernetes watch clients against Core BFF. */
const K8sSdkProvider: React.FC<K8sSdkProviderProps> = ({ store, children }) => {
  const [ready, setReady] = React.useState(isUtilsConfigSet);
  const sdkPluginStore = React.useMemo(() => new SdkPluginStore(), []);

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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    <AppInitSDK configurations={{ ...sdkConfig, pluginStore: sdkPluginStore }}>
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

export default K8sSdkProvider;

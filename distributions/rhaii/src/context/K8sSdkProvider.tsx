import * as React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, createStore, compose } from 'redux';
import reduxThunk from 'redux-thunk';
import type { PluginStore } from '@odh-dashboard/plugin-core';
import { PluginStore as SdkPluginStore, PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { AppInitSDK, isUtilsConfigSet, SDKReducers } from '@openshift/dynamic-plugin-sdk-utils';
import { Bullseye, Spinner } from '@patternfly/react-core';

const optionalMissingResources = [
  '/apis/template.openshift.io/v1/namespaces/',
  '/apis/infrastructure.opendatahub.io/v1/namespaces/',
];

const appFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  const response = await fetch(`/api/k8s${url}`, options);
  if (
    response.status === 404 &&
    optionalMissingResources.some((resourcePath) => url.startsWith(resourcePath))
  ) {
    return new Response(JSON.stringify({ apiVersion: 'v1', kind: 'List', items: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return response;
};

const sdkConfig: Omit<React.ComponentProps<typeof AppInitSDK>['configurations'], 'pluginStore'> = {
  appFetch,
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
  const sdkStore = React.useMemo(
    () => createStore(combineReducers(SDKReducers), compose(applyMiddleware(reduxThunk))),
    [],
  );

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
    <Provider store={sdkStore}>
      {/* AppInitSDK's published props omit React children. */}
      {/* @ts-expect-error AppInitSDK accepts children at runtime. */}
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
    </Provider>
  );
};

export default K8sSdkProvider;

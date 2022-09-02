import * as React from 'react';
import { AppInitSDK, isUtilsConfigSet } from '@openshift/dynamic-plugin-sdk-utils';
import { PluginLoader, PluginStore } from '@openshift/dynamic-plugin-sdk';
import { Bullseye, Spinner } from '@patternfly/react-core';

const config: React.ComponentProps<typeof AppInitSDK>['configurations'] = {
  appFetch: (url, options) => {
    // Using fetch instead of axios because of internal SDK structures that needs to use `response.text`
    return fetch(`/api/k8s${url}`, options);
  },

  /** Disable api discovery -- until we need to use the k8s watch hooks, we don't need to use api discovery */
  apiDiscovery: () => null,
  /** We don't need a plugin store yet -- we just want the SDK setup for utilities right now */
  pluginStore: (() => {
    const pluginStore = new PluginStore();
    pluginStore.setLoader(new PluginLoader());
    return pluginStore;
  })(),
  /**
   * No need for web sockets at this point -- we'll need to support this if we want to use the
   * websocket utilities or the k8s watch hooks.
   */
  wsAppSettings: () => Promise.resolve({ host: '', subProtocols: [] }),
};

const SDKInitialize: React.FC = ({ children }) => {
  // hack to make sure the SDK has fully loaded before we try to render the app
  // TODO: Figure out what's going on in the SDK
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const intervalId = setInterval(() => {
      if (isUtilsConfigSet()) {
        setReady(true);
        clearInterval(intervalId);
      }
    }, 1000);
  }, []);

  return (
    <AppInitSDK configurations={config}>
      {ready ? (
        children
      ) : (
        <Bullseye>
          <Spinner />
        </Bullseye>
      )}
    </AppInitSDK>
  );
};

export default SDKInitialize;

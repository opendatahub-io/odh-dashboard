import * as React from 'react';
import { AppInitSDK, isUtilsConfigSet } from '@openshift/dynamic-plugin-sdk-utils';
import { PluginLoader, PluginStore } from '@openshift/dynamic-plugin-sdk';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { K8sStatus } from './k8sTypes';
import { isK8sStatus, K8sStatusError } from './api';

const config: React.ComponentProps<typeof AppInitSDK>['configurations'] = {
  appFetch: (url, options) => {
    // Using fetch instead of axios because of internal SDK structures that needs to use `response.text`
    return fetch(`/api/k8s${url}`, options).then(async (response) => {
      if (response.status < 400) {
        // Valid response, let it flow through the normal system
        return response;
      }

      const result = await response.text();
      let data: K8sStatus | unknown;
      try {
        data = JSON.parse(result);
      } catch (e) {
        // Parsing error, just fallback on SDK logic
        return response;
      }
      if (isK8sStatus(data)) {
        // TODO: SDK does not support error states, we need them though
        // Turn it into an error object so we can use .catch
        throw new K8sStatusError(data);
      }

      // Not a status object, let the normal SDK flow take over
      return response;
    });
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

type SDKInitializeProps = {
  children: React.ReactNode;
};

const SDKInitialize: React.FC<SDKInitializeProps> = ({ children }) => {
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
    // TODO: remove when the SDK supports children type
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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

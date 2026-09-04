import * as React from 'react';
import { AppInitSDK, isUtilsConfigSet } from '@openshift/dynamic-plugin-sdk-utils';
import { PluginStore } from '@openshift/dynamic-plugin-sdk';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { WS_HOSTNAME } from './utilities/const';
import { toK8sFetchError } from './utilities/k8sFetchError';

const config: React.ComponentProps<typeof AppInitSDK>['configurations'] = {
  appFetch: (url, options) =>
    // Using fetch instead of axios because of internal SDK structures that needs to use `response.text`
    fetch(`/api/k8s${url}`, options).then(async (response) => {
      if (response.status < 400) {
        // Valid response, let it flow through the normal system
        return response;
      }

      // Any 4xx/5xx is a failure. The SDK only recognizes K8s Status bodies as errors, so every
      // other error body (backend rejections, router pages) must be converted here or the SDK
      // would hand it to callers as if it were the requested resource.
      throw toK8sFetchError(response.status, response.statusText, await response.text());
    }),
  /** Disable api discovery -- use static models */
  apiDiscovery: () => null,
  /** We don't need a plugin store yet -- we just want the SDK setup for utilities right now */
  pluginStore: new PluginStore(),
  /**
   * No need for web sockets at this point -- we'll need to support this if we want to use the
   * websocket utilities or the k8s watch hooks.
   */
  wsAppSettings: () =>
    Promise.resolve({
      host: `${location.protocol.replace(/^http/i, 'ws')}//${WS_HOSTNAME}/wss/k8s`,
      urlAugment: (url) => {
        const [origUrl, query] = url.split('?');
        const queryParams = new URLSearchParams(query);
        if (!queryParams.get('watch')) {
          queryParams.set('watch', 'true');
        }
        return `${origUrl}?${queryParams.toString()}`;
      },
      subProtocols: [],
    }),
};

type SDKInitializeProps = {
  children: React.ReactNode;
};

const SDKInitialize: React.FC<SDKInitializeProps> = ({ children }) => {
  // hack to make sure the SDK has fully loaded before we try to render the app
  // TODO: Figure out what's going on in the SDK
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const handler = () => {
      if (isUtilsConfigSet()) {
        setReady(true);
        clearInterval(intervalId);
      }
    };
    const intervalId = setInterval(handler, 100);
    // Immediately check to prevent unecessary delays
    handler();

    return () => {
      clearInterval(intervalId);
    };
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

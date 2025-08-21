import * as React from 'react';
import { AppInitSDK, isUtilsConfigSet } from '@openshift/dynamic-plugin-sdk-utils';
import { PluginStore } from '@openshift/dynamic-plugin-sdk';
import { Bullseye, Spinner } from '@patternfly/react-core';

const config: React.ComponentProps<typeof AppInitSDK>['configurations'] = {
  appFetch: (url, options) => fetch(`/api/k8s${url}`, options),
  apiDiscovery: () => null,
  pluginStore: new PluginStore(),
};

type SDKInitializeProps = {
  children: React.ReactNode;
};

const SDKInitialize: React.FC<SDKInitializeProps> = ({ children }) => {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const handler = () => {
      if (isUtilsConfigSet()) {
        setReady(true);
        clearInterval(intervalId);
      }
    };
    const intervalId = setInterval(handler, 100);
    handler();
    return () => clearInterval(intervalId);
  }, []);

  return (
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

import * as React from 'react';
import type { PluginStore } from '@odh-dashboard/plugin-core';
import { K8sSdkProvider as BaseK8sSdkProvider } from '@odh-dashboard/base-distribution';
import { PORTAL_BASE_PATH } from '../portalPaths';

const appFetch = (url: string, options?: RequestInit): Promise<Response> =>
  fetch(`${PORTAL_BASE_PATH}/api/k8s${url}`, options);

type K8sSdkProviderProps = {
  store: PluginStore;
  children: React.ReactNode;
};

const K8sSdkProvider: React.FC<K8sSdkProviderProps> = ({ store, children }) => (
  <BaseK8sSdkProvider store={store} appFetch={appFetch}>
    {children}
  </BaseK8sSdkProvider>
);

export default K8sSdkProvider;

import * as React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, createStore, compose } from 'redux';
import reduxThunk from 'redux-thunk';
import type { PluginStore } from '@odh-dashboard/plugin-core';
import { SDKReducers } from '@openshift/dynamic-plugin-sdk-utils';
import { K8sSdkProvider as BaseK8sSdkProvider } from '../../../base/src/lib';

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

type K8sSdkProviderProps = {
  store: PluginStore;
  children: React.ReactNode;
};

/** Adds RHAII's SDK Redux state around the shared Kubernetes SDK provider. */
const K8sSdkProvider: React.FC<K8sSdkProviderProps> = ({ store, children }) => {
  const sdkStore = React.useMemo(
    () => createStore(combineReducers(SDKReducers), compose(applyMiddleware(reduxThunk))),
    [],
  );

  return (
    <Provider store={sdkStore}>
      <BaseK8sSdkProvider store={store} appFetch={appFetch}>
        {children}
      </BaseK8sSdkProvider>
    </Provider>
  );
};

export default K8sSdkProvider;

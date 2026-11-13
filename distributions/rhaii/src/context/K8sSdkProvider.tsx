import * as React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, createStore, compose } from 'redux';
import reduxThunk from 'redux-thunk';
import type { PluginStore } from '@odh-dashboard/plugin-core';
import { SDKReducers } from '@openshift/dynamic-plugin-sdk-utils';
import { K8sSdkProvider as BaseK8sSdkProvider } from '@odh-dashboard/base-distribution';
import { k8sFetch } from './k8sFetch';

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
      <BaseK8sSdkProvider store={store} appFetch={k8sFetch}>
        {children}
      </BaseK8sSdkProvider>
    </Provider>
  );
};

export default K8sSdkProvider;

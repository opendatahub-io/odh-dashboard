import * as React from 'react';
import useFetch, { FetchStateCallbackPromise } from '@odh-dashboard/internal/utilities/useFetch';
import { proxyGET } from '@odh-dashboard/internal/api/proxyUtils';

export type RegistryFeatureStore = {
  name: string;
  project: string;
  registry: {
    path: string;
  };
  namespace?: string;
  status: {
    conditions: Array<{
      type: string;
      status: string;
      lastTransitionTime: string;
    }>;
  };
};

type RegistryFeatureStoresResponse = {
  featureStores: RegistryFeatureStore[];
};

type UseRegistryFeatureStoresReturn = {
  featureStores: RegistryFeatureStore[];
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
};

export const useRegistryFeatureStores = (): UseRegistryFeatureStoresReturn => {
  const callback = React.useCallback<
    FetchStateCallbackPromise<RegistryFeatureStore[]>
  >(async () => {
    const data: RegistryFeatureStoresResponse = await proxyGET('', `/api/featurestores`);
    return data.featureStores;
  }, []);

  const {
    data: featureStores,
    loaded,
    error,
    refresh: refreshData,
  } = useFetch(callback, [], {
    initialPromisePurity: true,
  });

  const refresh = React.useCallback(async () => {
    await refreshData();
  }, [refreshData]);

  return {
    featureStores,
    loaded,
    error,
    refresh,
  };
};

export default useRegistryFeatureStores;

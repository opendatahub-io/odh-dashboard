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
  enabledCRDCount?: number;
};

type UseRegistryFeatureStoresReturn = {
  featureStores: RegistryFeatureStore[];
  enabledCRDCount: number;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
};

type FeatureStoresData = {
  featureStores: RegistryFeatureStore[];
  enabledCRDCount: number;
};

export const useRegistryFeatureStores = (): UseRegistryFeatureStoresReturn => {
  const callback = React.useCallback<FetchStateCallbackPromise<FeatureStoresData>>(async () => {
    const data: RegistryFeatureStoresResponse = await proxyGET('', `/api/featurestores`);
    return { featureStores: data.featureStores, enabledCRDCount: data.enabledCRDCount ?? 0 };
  }, []);

  const {
    data,
    loaded,
    error,
    refresh: refreshData,
  } = useFetch(
    callback,
    { featureStores: [], enabledCRDCount: 0 },
    {
      initialPromisePurity: true,
    },
  );

  const refresh = React.useCallback(async () => {
    await refreshData();
  }, [refreshData]);

  return {
    featureStores: data.featureStores,
    enabledCRDCount: data.enabledCRDCount,
    loaded,
    error,
    refresh,
  };
};

export default useRegistryFeatureStores;

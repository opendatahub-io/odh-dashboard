import * as React from 'react';
import useFetch, { FetchStateCallbackPromise } from '#~/utilities/useFetch';
import { ConfigMapKind } from '#~/k8sTypes';
import {
  getWorkbenchFeatureStores,
  WorkbenchFeatureStoreResponse,
} from '#~/api/featureStore/custom';

export type WorkbenchFeatureStoreConfig = {
  namespace: string;
  configName: string;
  projectName: string;
  configMap: ConfigMapKind | null;
  hasAccessToFeatureStore: boolean;
};

type UseWorkbenchFeatureStoresReturn = {
  featureStores: WorkbenchFeatureStoreConfig[];
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
};

export const useWorkbenchFeatureStores = (): UseWorkbenchFeatureStoresReturn => {
  const callback = React.useCallback<
    FetchStateCallbackPromise<WorkbenchFeatureStoreConfig[]>
  >(async () => {
    const data: WorkbenchFeatureStoreResponse = await getWorkbenchFeatureStores();
    if (!Array.isArray(data.namespaces)) {
      throw new Error('Failed to load feature stores');
    }
    const configs: WorkbenchFeatureStoreConfig[] = data.namespaces.flatMap((ns) =>
      Array.isArray(ns.clientConfigs)
        ? ns.clientConfigs.map((config) => ({
            namespace: ns.namespace,
            configName: config.configName,
            projectName: config.projectName,
            configMap: null,
            hasAccessToFeatureStore: config.hasAccessToFeatureStore,
          }))
        : [],
    );
    return configs;
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

export default useWorkbenchFeatureStores;

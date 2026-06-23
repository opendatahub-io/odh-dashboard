import * as React from 'react';
import useFetch, { FetchStateCallbackPromise } from '#~/utilities/useFetch';
import { getFeatureStoreProjects, FeatureStoreProject } from '#~/api/featureStore/custom';

export type { FeatureStoreProject };

type UseFeatureStoreProjectsReturn = {
  featureStoreProjects: FeatureStoreProject[];
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
};

export const useFeatureStoreProjects = (): UseFeatureStoreProjectsReturn => {
  const callback = React.useCallback<FetchStateCallbackPromise<FeatureStoreProject[]>>(async () => {
    const data = await getFeatureStoreProjects();
    if (!Array.isArray(data.connectedWorkbenches)) {
      throw new Error('Failed to load feature store projects');
    }
    return data.connectedWorkbenches;
  }, []);

  const {
    data: featureStoreProjects,
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
    featureStoreProjects,
    loaded,
    error,
    refresh,
  };
};

export default useFeatureStoreProjects;

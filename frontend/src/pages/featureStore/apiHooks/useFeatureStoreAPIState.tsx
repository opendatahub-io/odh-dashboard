import React from 'react';
import { APIState } from '#~/concepts/proxy/types';
import { FeatureStoreAPIs } from '#~/pages/featureStore/types/global';
import { getEntities, listFeatureStoreProject } from '#~/api/featureStore/custom';
import useAPIState from '#~/concepts/proxy/useAPIState';

export type FeatureStoreAPIState = APIState<FeatureStoreAPIs>;

const useFeatureStoreAPIState = (
  hostPath: string | null,
): [apiState: FeatureStoreAPIState, refreshAPIState: () => void] => {
  const createAPI = React.useCallback(
    (path: string) => ({
      listFeatureStoreProject: listFeatureStoreProject(path),
      getEntities: getEntities(path),
    }),
    [],
  );

  return useAPIState(hostPath, createAPI);
};

export default useFeatureStoreAPIState;

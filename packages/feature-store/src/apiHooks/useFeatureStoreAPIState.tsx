import React from 'react';
import { APIState } from '@odh-dashboard/internal/concepts/proxy/types';
import useAPIState from '@odh-dashboard/internal/concepts/proxy/useAPIState';
import {
  getEntities,
  getFeatureViews,
  listFeatureStoreProject,
  getFeatureByName,
  getFeatures,
  getEntityByName,
  getFeatureServices,
  getFeatureServiceByName,
  getFeatureViewByName,
  getMetricsResourceCount,
  getPopularTags,
  getRecentlyVisitedResources,
} from '../api/custom';
import { FeatureStoreAPIs } from '../types/global';

export type FeatureStoreAPIState = APIState<FeatureStoreAPIs>;

const useFeatureStoreAPIState = (
  hostPath: string | null,
): [apiState: FeatureStoreAPIState, refreshAPIState: () => void] => {
  const createAPI = React.useCallback(
    (path: string) => ({
      listFeatureStoreProject: listFeatureStoreProject(path),
      getEntities: getEntities(path),
      getFeatureViews: getFeatureViews(path),
      getEntityByName: getEntityByName(path),
      getFeatures: getFeatures(path),
      getFeatureByName: getFeatureByName(path),
      getFeatureServices: getFeatureServices(path),
      getFeatureServiceByName: getFeatureServiceByName(path),
      getFeatureViewByName: getFeatureViewByName(path),
      getMetricsResourceCount: getMetricsResourceCount(path),
      getPopularTags: getPopularTags(path),
      getRecentlyVisitedResources: getRecentlyVisitedResources(path),
    }),
    [],
  );

  return useAPIState(hostPath, createAPI);
};

export default useFeatureStoreAPIState;

/* eslint-disable camelcase */
import * as React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';
import { useFeatureStoreAPI } from '../FeatureStoreContext';
import { FeatureStoreLineage } from '../types/lineage';

const useFeatureStoreLineage = (project?: string): FetchStateObject<FeatureStoreLineage> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<FeatureStoreLineage>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      if (!project) {
        return Promise.reject(new Error('Project is required'));
      }

      return api.getLineageData(opts, project);
    },
    [api, apiAvailable, project],
  );

  return useFetch(
    call,
    {
      project: '',
      objects: {
        entities: [],
        dataSources: [],
        featureViews: [],
        featureServices: [],
        features: [],
      },
      relationships: [],
      indirectRelationships: [],
      pagination: {
        entities: {
          totalCount: 0,
          totalPages: 0,
        },
        dataSources: {
          totalCount: 0,
          totalPages: 0,
        },
        featureViews: {
          totalCount: 0,
          totalPages: 0,
        },
        featureServices: {
          totalCount: 0,
          totalPages: 0,
        },
        features: {
          totalCount: 0,
          totalPages: 0,
        },
        relationships: {
          totalCount: 0,
          totalPages: 0,
        },
        indirectRelationships: {
          totalCount: 0,
          totalPages: 0,
        },
      },
    },
    { initialPromisePurity: true },
  );
};

export default useFeatureStoreLineage;

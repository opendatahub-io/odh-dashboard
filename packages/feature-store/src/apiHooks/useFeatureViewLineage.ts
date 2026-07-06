/* eslint-disable camelcase */
import * as React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';
import { useFeatureStoreAPI } from '../FeatureStoreContext';
import { FeatureViewLineage } from '../types/lineage';

const useFeatureViewLineage = (
  project?: string,
  featureViewName?: string,
): FetchStateObject<FeatureViewLineage> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<FeatureViewLineage>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      if (!project) {
        return Promise.reject(new Error('Project is required'));
      }

      if (!featureViewName) {
        return Promise.reject(new Error('Feature view name is required'));
      }

      return api.getFeatureViewLineage(opts, project, featureViewName);
    },
    [api, apiAvailable, project, featureViewName],
  );

  return useFetch(
    call,
    {
      relationships: [],
      pagination: { totalCount: 0, totalPages: 0 },
    },
    { initialPromisePurity: true },
  );
};

export default useFeatureViewLineage;

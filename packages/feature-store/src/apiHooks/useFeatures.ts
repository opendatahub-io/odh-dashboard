import * as React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';
import { useFeatureStoreAPI } from '../FeatureStoreContext';
import { FeaturesList } from '../types/features';

const useFeatures = (project?: string): FetchStateObject<FeaturesList> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<FeaturesList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      return api.getFeatures(opts, project);
    },
    [api, apiAvailable, project],
  );

  return useFetch(
    call,
    {
      features: [],
      pagination: {
        page: 1,
        limit: 10,
        totalCount: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    },
    { initialPromisePurity: true },
  );
};

export default useFeatures;

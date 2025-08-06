import * as React from 'react';
import { useFeatureStoreAPI } from '#~/pages/featureStore/FeatureStoreContext';
import useFetch, { FetchStateCallbackPromise, FetchStateObject } from '#~/utilities/useFetch';
import { FeatureViewsList } from '#~/pages/featureStore/types/featureView';

const useFeatureViews = (project?: string, entity?: string): FetchStateObject<FeatureViewsList> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<FeatureViewsList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      return api.getFeatureViews(opts, project, entity);
    },
    [api, apiAvailable, project, entity],
  );

  return useFetch(
    call,
    {
      featureViews: [],
      pagination: {
        totalCount: 0,
        totalPages: 0,
      },
    },
    { initialPromisePurity: true },
  );
};

export default useFeatureViews;

import * as React from 'react';
import { useFeatureStoreAPI } from '#~/pages/featureStore/FeatureStoreContext';
import useFetch, { FetchStateCallbackPromise, FetchStateObject } from '#~/utilities/useFetch';
import { FeatureServicesList } from '#~/pages/featureStore/types/featureServices';

const useFeatureServices = (project?: string): FetchStateObject<FeatureServicesList> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<FeatureServicesList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      return api.getFeatureServices(opts, project);
    },
    [api, apiAvailable, project],
  );

  return useFetch(
    call,
    {
      featureServices: [],
      pagination: {
        totalCount: 0,
        totalPages: 0,
      },
    },
    { initialPromisePurity: true },
  );
};

export default useFeatureServices;

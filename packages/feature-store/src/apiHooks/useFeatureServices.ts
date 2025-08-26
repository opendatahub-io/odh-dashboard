import * as React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';
import { useFeatureStoreAPI } from '../FeatureStoreContext';
import { FeatureServicesList } from '../types/featureServices';

const useFeatureServices = (
  project?: string,
  featureView?: string,
): FetchStateObject<FeatureServicesList> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<FeatureServicesList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      return api.getFeatureServices(opts, project, featureView);
    },
    [api, apiAvailable, project, featureView],
  );

  return useFetch(
    call,
    {
      featureServices: [],
      pagination: {
        totalCount: 0,
        totalPages: 0,
      },
      relationships: {},
    },
    { initialPromisePurity: true },
  );
};

export default useFeatureServices;

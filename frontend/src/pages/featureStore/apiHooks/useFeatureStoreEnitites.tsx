/* eslint-disable camelcase */
import * as React from 'react';
import { useFeatureStoreAPI } from '#~/pages/featureStore/FeatureStoreContext';
import useFetch, { FetchStateCallbackPromise, FetchStateObject } from '#~/utilities/useFetch';
import { EntityList } from '#~/pages/featureStore/types/entities';

const useFeatureStoreEntities = (project?: string): FetchStateObject<EntityList> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<EntityList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      return api.getEntities(opts, project);
    },
    [api, apiAvailable, project],
  );

  return useFetch(
    call,
    {
      entities: [],
      pagination: {
        page: 0,
        limit: 0,
        total_count: 0,
        total_pages: 0,
        has_next: false,
        has_previous: false,
      },
    },
    { initialPromisePurity: true },
  );
};

export default useFeatureStoreEntities;

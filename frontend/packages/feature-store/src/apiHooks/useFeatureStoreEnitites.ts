/* eslint-disable camelcase */
import * as React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';
import { useFeatureStoreAPI } from '../FeatureStoreContext';
import { EntityList } from '../types/entities';

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
      relationships: {},
    },
    { initialPromisePurity: true },
  );
};

export default useFeatureStoreEntities;

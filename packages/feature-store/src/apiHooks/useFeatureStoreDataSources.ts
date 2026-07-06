/* eslint-disable camelcase */
import * as React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';
import { useFeatureStoreAPI } from '../FeatureStoreContext';
import { DataSourceList } from '../types/dataSources';

const useFeatureStoreDataSources = (project?: string): FetchStateObject<DataSourceList> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<DataSourceList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      return api.getDataSources(opts, project);
    },
    [api, apiAvailable, project],
  );

  return useFetch(
    call,
    {
      dataSources: [],
      pagination: {
        page: 1,
        limit: 50,
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

export default useFeatureStoreDataSources;

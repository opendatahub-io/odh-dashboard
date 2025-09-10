/* eslint-disable camelcase */
import * as React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';
import { useFeatureStoreAPI } from '../FeatureStoreContext';
import { DataSetList } from '../types/dataSets';

const useFeatureStoreDataSets = (project?: string): FetchStateObject<DataSetList> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<DataSetList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      return api.getSavedDatasets(opts, project);
    },
    [api, apiAvailable, project],
  );

  return useFetch(
    call,
    {
      savedDatasets: [],
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

export default useFeatureStoreDataSets;

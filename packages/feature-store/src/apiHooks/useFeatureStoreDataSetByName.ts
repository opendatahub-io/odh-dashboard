/* eslint-disable camelcase */
import * as React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';
import { useFeatureStoreAPI } from '../FeatureStoreContext';
import { DataSet } from '../types/dataSets';

const useFeatureStoreDataSetByName = (
  project?: string,
  dataSetName?: string,
): FetchStateObject<DataSet> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<DataSet>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      if (!project) {
        return Promise.reject(new Error('Project is required'));
      }

      if (!dataSetName) {
        return Promise.reject(new Error('Data set name is required'));
      }

      return api.getDataSetByName(opts, project, dataSetName);
    },
    [api, apiAvailable, project, dataSetName],
  );

  return useFetch(
    call,
    {
      spec: {
        description: '',
        name: '',
        features: [],
        joinKeys: [],
        storage: {
          fileStorage: {
            fileFormat: {
              parquetFormat: {},
            },
            uri: '',
          },
        },
      },
      meta: {
        createdTimestamp: '',
        lastUpdatedTimestamp: '',
        maxEventTimestamp: '',
        minEventTimestamp: '',
      },
      project: '',
    },
    { initialPromisePurity: true },
  );
};

export default useFeatureStoreDataSetByName;

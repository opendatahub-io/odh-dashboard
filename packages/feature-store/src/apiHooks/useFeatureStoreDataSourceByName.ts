/* eslint-disable camelcase */
import * as React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';
import { useFeatureStoreAPI } from '../FeatureStoreContext';
import { DataSource } from '../types/dataSources';

const useFeatureStoreDataSourceByName = (
  project?: string,
  dataSourceName?: string,
): FetchStateObject<DataSource> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<DataSource>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      if (!project) {
        return Promise.reject(new Error('Project is required'));
      }

      if (!dataSourceName) {
        return Promise.reject(new Error('Data source name is required'));
      }

      return api.getDataSourceByName(opts, project, dataSourceName);
    },
    [api, apiAvailable, project, dataSourceName],
  );

  return useFetch(
    call,
    {
      type: 'BATCH_FILE',
      timestampField: '',
      createdTimestampColumn: '',
      fileOptions: {
        uri: '',
      },
      name: '',
      meta: {
        createdTimestamp: '',
        lastUpdatedTimestamp: '',
      },
      featureDefinition: '',
      project: '',
    },
    { initialPromisePurity: true },
  );
};

export default useFeatureStoreDataSourceByName;

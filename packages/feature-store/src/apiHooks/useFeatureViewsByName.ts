import * as React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';
import { useFeatureStoreAPI } from '../FeatureStoreContext';
import { FeatureView } from '../types/featureView';

const useFeatureViewsByName = (
  project?: string,
  featureViewName?: string,
): FetchStateObject<FeatureView> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<FeatureView>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }
      if (!project) {
        return Promise.reject(new Error('Project is required'));
      }

      if (!featureViewName) {
        return Promise.reject(new Error('Feature view name is required'));
      }

      return api.getFeatureViewByName(opts, project, featureViewName);
    },
    [api, apiAvailable, project, featureViewName],
  );

  return useFetch(
    call,
    {
      type: 'featureView',
      spec: {
        name: '',
        entities: [],
        features: [],
        tags: {},
        ttl: '',
        batchSource: {
          type: '',
          timestampField: '',
          createdTimestampColumn: '',
          fileOptions: {
            uri: '',
          },
          name: '',
        },
        online: false,
        offline: false,
        description: '',
        owner: '',
        entityColumns: [],
        streamSource: {
          type: '',
          dataSourceClassType: '',
          name: '',
          fileOptions: {
            uri: '',
          },
          batchSource: {
            type: '',
            timestampField: '',
            createdTimestampColumn: '',
            fileOptions: {
              uri: '',
            },
            name: '',
          },
          meta: {
            createdTimestamp: '',
            lastUpdatedTimestamp: '',
          },
        },
      },
      featureDefinition: '',
      relationships: [],
      meta: {
        createdTimestamp: '',
        lastUpdatedTimestamp: '',
      },
      project: '',
    },
    { initialPromisePurity: true },
  );
};

export default useFeatureViewsByName;

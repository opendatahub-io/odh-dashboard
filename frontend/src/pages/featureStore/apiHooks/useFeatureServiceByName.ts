import * as React from 'react';
import { useFeatureStoreAPI } from '#~/pages/featureStore/FeatureStoreContext';
import useFetch, { FetchStateCallbackPromise, FetchStateObject } from '#~/utilities/useFetch';
import { FeatureService } from '#~/pages/featureStore/types/featureServices';

const useFeatureServiceByName = (
  project?: string,
  featureServiceName?: string,
): FetchStateObject<FeatureService> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<FeatureService>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      if (!project) {
        return Promise.reject(new Error('Project is required'));
      }

      if (!featureServiceName) {
        return Promise.reject(new Error('Feature name is required'));
      }
      console.log('project', project);

      return api.getFeatureServiceByName(opts, project, featureServiceName);
    },
    [api, apiAvailable, project, featureServiceName],
  );

  return useFetch(
    call,
    {
      spec: {
        name: '',
        features: [],
        tags: {},
        description: '',
        owner: '',
      },
      meta: {
        createdTimestamp: '',
        lastUpdatedTimestamp: '',
      },
    },
    { initialPromisePurity: true },
  );
};

export default useFeatureServiceByName;

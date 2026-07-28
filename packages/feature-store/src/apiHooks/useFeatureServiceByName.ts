import * as React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import { useFeatureStoreAPI } from '../FeatureStoreContext';
import { FeatureService } from '../types/featureServices';

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
        return Promise.reject(new Error('Feature service name is required'));
      }

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

import * as React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';
import { useFeatureStoreAPI } from '../FeatureStoreContext';
import { Features } from '../types/features';

const useFeatureByName = (
  project?: string,
  featureViewName?: string,
  featureName?: string,
): FetchStateObject<Features> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<Features>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      if (!project) {
        return Promise.reject(new Error('Project is required'));
      }

      if (!featureName) {
        return Promise.reject(new Error('Feature name is required'));
      }

      if (!featureViewName) {
        return Promise.reject(new Error('Feature view name is required'));
      }

      return api.getFeatureByName(opts, project, featureViewName, featureName);
    },
    [api, apiAvailable, project, featureName, featureViewName],
  );

  return useFetch(
    call,
    {
      name: '',
      featureView: '',
      type: '',
      project: '',
      owner: '',
      tags: {},
      description: '',
    },
    { initialPromisePurity: true },
  );
};

export default useFeatureByName;

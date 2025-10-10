/* eslint-disable camelcase */
import * as React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';
import { FeatureStoreAPIState } from './useFeatureStoreAPIState';
import { ProjectList } from '../types/featureStoreProjects';
import { DEFAULT_PROJECT_LIST } from '../const';

const useFeatureStoreProjectsAPI = (
  apiState: FeatureStoreAPIState,
): FetchStateObject<ProjectList> => {
  const call = React.useCallback<FetchStateCallbackPromise<ProjectList>>(
    (opts) => {
      if (!apiState.apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }
      return apiState.api.listFeatureStoreProject(opts);
    },
    [apiState.api, apiState.apiAvailable],
  );

  const result = useFetch(call, DEFAULT_PROJECT_LIST, { initialPromisePurity: true });
  return result;
};

export default useFeatureStoreProjectsAPI;

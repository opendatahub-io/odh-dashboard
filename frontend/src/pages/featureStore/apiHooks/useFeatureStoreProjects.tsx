/* eslint-disable camelcase */
import * as React from 'react';
import { useFeatureStoreAPI } from '#~/pages/featureStore/FeatureStoreContext';
import useFetch, { FetchStateCallbackPromise, FetchStateObject } from '#~/utilities/useFetch';
import { ProjectList } from '#~/pages/featureStore/types/featureStoreProjects';

const useFeatureStoreProjects = (): FetchStateObject<ProjectList> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<ProjectList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      return api.listFeatureStoreProject(opts);
    },
    [api, apiAvailable],
  );

  return useFetch(
    call,
    {
      projects: [],
      pagination: {
        page: 0,
        limit: 0,
        total_count: 0,
        total_pages: 0,
        has_next: false,
        has_previous: false,
      },
    },
    { initialPromisePurity: true },
  );
};

export default useFeatureStoreProjects;

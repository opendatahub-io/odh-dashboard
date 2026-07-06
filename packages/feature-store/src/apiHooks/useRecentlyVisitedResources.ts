import * as React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';
import { useFeatureStoreAPI } from '../FeatureStoreContext';
import { RecentlyVisitedResponse } from '../types/metrics';

type UseRecentlyVisitedResourcesProps = {
  project?: string;
  limit: number;
};

const useRecentlyVisitedResources = ({
  project,
  limit,
}: UseRecentlyVisitedResourcesProps): FetchStateObject<RecentlyVisitedResponse> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<RecentlyVisitedResponse>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      return api.getRecentlyVisitedResources(opts, project, limit);
    },
    [api, apiAvailable, project, limit],
  );

  return useFetch(
    call,
    {
      visits: [],
      pagination: {
        totalCount: 0,
      },
    },
    { initialPromisePurity: true },
  );
};

export default useRecentlyVisitedResources;

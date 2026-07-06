/* eslint-disable camelcase */
import * as React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';
import { useFeatureStoreAPI } from '../FeatureStoreContext';
import { PopularTagsResponse } from '../types/metrics';

type UseMetricsPopularTagsProps = {
  project?: string;
  limit: number;
};

const useMetricsPopularTags = ({
  project,
  limit,
}: UseMetricsPopularTagsProps): FetchStateObject<PopularTagsResponse> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PopularTagsResponse>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      return api.getPopularTags(opts, project, limit);
    },
    [api, apiAvailable, project, limit],
  );

  return useFetch(
    call,
    {
      popular_tags: [],
      metadata: {
        totalFeatureViews: 0,
        totalTags: 0,
        limit,
      },
    },
    { initialPromisePurity: true },
  );
};

export default useMetricsPopularTags;

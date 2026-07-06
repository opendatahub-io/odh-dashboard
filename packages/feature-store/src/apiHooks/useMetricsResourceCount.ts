import * as React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';
import { useFeatureStoreAPI } from '../FeatureStoreContext';
import { MetricsCountResponse } from '../types/metrics';

type UseMetricsResourceCountProps = {
  project?: string;
};

const useMetricsResourceCount = ({
  project,
}: UseMetricsResourceCountProps): FetchStateObject<MetricsCountResponse> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<MetricsCountResponse>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }
      if (project) {
        return api.getMetricsResourceCount(opts, project);
      }

      return api.getMetricsResourceCount(opts);
    },
    [api, apiAvailable, project],
  );

  return useFetch(
    call,
    {
      total: undefined,
      perProject: undefined,
      project: undefined,
      counts: undefined,
    },
    { initialPromisePurity: true },
  );
};

export default useMetricsResourceCount;

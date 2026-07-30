import * as React from 'react';
import useFetch, {
  FetchOptions,
  FetchStateObject,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import type { PrometheusQueryResponse } from '@odh-dashboard/k8s-core/prometheus';
import axios from '#~/utilities/axios';

const usePrometheusQuery = <TResponse = PrometheusQueryResponse>(
  apiPath: string,
  query?: string,
  fetchOptions?: Partial<FetchOptions>,
): FetchStateObject<TResponse | null> => {
  const fetchData = React.useCallback(() => {
    if (!query) {
      return Promise.reject(new NotReadyError('No query'));
    }

    return axios
      .post<{ response: TResponse }>(apiPath, { query })
      .then((response) => response.data.response);
  }, [query, apiPath]);

  return useFetch<TResponse | null>(fetchData, null, fetchOptions);
};

export default usePrometheusQuery;

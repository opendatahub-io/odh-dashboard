import * as React from 'react';
import axios from '#~/utilities/axios';
import { PrometheusQueryResponse } from '#~/types';
import useFetchState, { FetchOptions, FetchState, NotReadyError } from '#~/utilities/useFetchState';

const usePrometheusQuery = <TResponse = PrometheusQueryResponse>(
  apiPath: string,
  query?: string,
  fetchOptions?: Partial<FetchOptions>,
): FetchState<TResponse | null> => {
  const fetchData = React.useCallback(() => {
    if (!query) {
      return Promise.reject(new NotReadyError('No query'));
    }

    return axios
      .post<{ response: TResponse }>(apiPath, { query })
      .then((response) => response.data.response);
  }, [query, apiPath]);

  return useFetchState<TResponse | null>(fetchData, null, fetchOptions);
};

export default usePrometheusQuery;

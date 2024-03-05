import * as React from 'react';
import axios from 'axios';
import { PrometheusQueryResponse } from '~/types';
import useFetchState, { FetchOptions, FetchState, NotReadyError } from '~/utilities/useFetchState';

type PromState = PrometheusQueryResponse | null;

const usePrometheusQuery = (
  apiPath: string,
  query?: string,
  fetchOptions?: Partial<FetchOptions>,
): FetchState<PromState> => {
  const fetchData = React.useCallback(() => {
    if (!query) {
      return Promise.reject(new NotReadyError('No query'));
    }

    return axios
      .post<{ response: PrometheusQueryResponse }>(apiPath, { query })
      .then((response) => response.data.response);
  }, [query, apiPath]);

  return useFetchState<PromState>(fetchData, null, fetchOptions);
};

export default usePrometheusQuery;

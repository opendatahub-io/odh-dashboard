import * as React from 'react';
import axios from 'axios';
import { PrometheusQueryRangeResponse, PrometheusQueryRangeResultValue } from '~/types';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';

const usePrometheusQueryRange = (
  apiPath: string,
  queryLang: string,
  span: number,
  endInMs: number,
  step: number,
): FetchState<PrometheusQueryRangeResultValue[]> => {
  const fetchData = React.useCallback<
    FetchStateCallbackPromise<PrometheusQueryRangeResultValue[]>
  >(() => {
    const endInS = endInMs / 1000;
    const start = endInS - span;

    return axios
      .post<{ response: PrometheusQueryRangeResponse }>(apiPath, {
        query: `${queryLang}&start=${start}&end=${endInS}&step=${step}`,
      })
      .then((response) => response.data?.response.data.result?.[0]?.values || []);
  }, [queryLang, apiPath, span, endInMs, step]);

  return useFetchState<PrometheusQueryRangeResultValue[]>(fetchData, []);
};

export default usePrometheusQueryRange;

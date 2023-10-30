import * as React from 'react';
import axios from 'axios';

import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import {
  PrometheusQueryRangeResponse,
  PrometheusQueryRangeResponseData,
  PrometheusQueryRangeResultValue,
} from '~/types';

export type ResponsePredicate<T = PrometheusQueryRangeResultValue> = (
  data: PrometheusQueryRangeResponseData,
) => T[];

const usePrometheusQueryRange = <T = PrometheusQueryRangeResultValue>(
  active: boolean,
  apiPath: string,
  queryLang: string,
  span: number,
  endInMs: number,
  step: number,
  responsePredicate: ResponsePredicate<T>,
  namespace: string,
): FetchState<T[]> => {
  const fetchData = React.useCallback<FetchStateCallbackPromise<T[]>>(() => {
    const endInS = endInMs / 1000;
    const start = endInS - span;

    if (!active) {
      return Promise.reject(new NotReadyError('Prometheus query is not active'));
    }

    return axios
      .post<{ response: PrometheusQueryRangeResponse }>(apiPath, {
        query: `namespace=${namespace}&query=${queryLang}&start=${start}&end=${endInS}&step=${step}`,
      })

      .then((response) => responsePredicate(response.data?.response.data));
  }, [endInMs, span, active, apiPath, namespace, queryLang, step, responsePredicate]);

  return useFetchState<T[]>(fetchData, []);
};

export default usePrometheusQueryRange;

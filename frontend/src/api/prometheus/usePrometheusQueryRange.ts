import * as React from 'react';
import axios from 'axios';

import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';
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
  responsePredicate?: ResponsePredicate<T>,
): FetchState<T[]> => {
  const fetchData = React.useCallback<FetchStateCallbackPromise<T[]>>(() => {
    const endInS = endInMs / 1000;
    const start = endInS - span;

    return axios
      .post<{ response: PrometheusQueryRangeResponse }>(apiPath, {
        query: `query=${queryLang}&start=${start}&end=${endInS}&step=${step}`,
      })

      .then((response) => {
        let result: T[] | PrometheusQueryRangeResultValue[];
        if (responsePredicate) {
          result = responsePredicate(response.data?.response.data);
        } else {
          result = response.data?.response.data.result?.[0]?.values || [];
        }
        return result as T[];
      });
  }, [endInMs, span, apiPath, queryLang, step, responsePredicate]);

  return useFetchState<T[]>(fetchData, []);
};

export default usePrometheusQueryRange;

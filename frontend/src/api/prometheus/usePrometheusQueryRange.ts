import * as React from 'react';
import axios from '#~/utilities/axios';

import useFetchState, {
  FetchOptions,
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';
import {
  PrometheusQueryRangeResponse,
  PrometheusQueryRangeResponseData,
  PrometheusQueryRangeResponseDataResult,
  PrometheusQueryRangeResultValue,
} from '#~/types';

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
  fetchOptions?: Partial<FetchOptions>,
): [...FetchState<T[]>, boolean] => {
  const pendingRef = React.useRef(active);
  const fetchData = React.useCallback<FetchStateCallbackPromise<T[]>>(() => {
    const endInS = endInMs / 1000;
    const start = endInS - span;

    if (!active) {
      return Promise.reject(new NotReadyError('Prometheus query is not active'));
    }

    return axios
      .post<{ response: PrometheusQueryRangeResponse }>(apiPath, {
        query: new URLSearchParams({
          namespace,
          query: queryLang,
          start: start.toString(),
          end: endInS.toString(),
          step: step.toString(),
        }).toString(),
      })
      .then((response) => responsePredicate(response.data.response.data))
      .finally(() => {
        pendingRef.current = false;
      });
  }, [endInMs, span, active, apiPath, namespace, queryLang, step, responsePredicate]);

  // The query is pending if fetchData changes because it will trigger useFetchState to re-fetch
  React.useMemo(() => {
    pendingRef.current = active;
    // We do not reference fetchData but need to react to it changing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, fetchData]);

  return [...useFetchState<T[]>(fetchData, [], fetchOptions), pendingRef.current];
};

export const defaultResponsePredicate: ResponsePredicate = (data) => data.result?.[0]?.values || [];

export const prometheusQueryRangeResponsePredicate: ResponsePredicate<
  PrometheusQueryRangeResponseDataResult
> = (data) => data.result || [];

export default usePrometheusQueryRange;

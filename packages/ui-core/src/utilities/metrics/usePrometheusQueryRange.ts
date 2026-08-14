import * as React from 'react';
import useFetchState, {
  FetchOptions,
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '../../hooks/useFetchState';
import type {
  PrometheusQueryRangeResponse,
  PrometheusQueryRangeResponseData,
  PrometheusQueryRangeResponseDataResult,
  PrometheusQueryRangeResultValue,
} from '../../types/metrics';

export type ResponsePredicate<T = PrometheusQueryRangeResultValue> = (
  data: PrometheusQueryRangeResponseData,
) => T[];

/**
 * POST function signature for Prometheus queries.
 * Accepts a URL and body string, returns the parsed response data.
 */
export type PrometheusPostFn = (
  url: string,
  body: { query: string },
) => Promise<{ response: PrometheusQueryRangeResponse }>;

// `post` is intentionally required (no plain-`fetch` default). Runtime callers
// must inject a transport bound to the dashboard's authenticated instance so
// requests carry cookies, CSRF, `x-odh-feature-flags`, and interceptors. The
// frontend wrapper (`frontend/src/api/prometheus/usePrometheusQueryRange.ts`)
// supplies an axios-backed transport.
const usePrometheusQueryRange = <T = PrometheusQueryRangeResultValue>(
  active: boolean,
  apiPath: string,
  queryLang: string,
  span: number,
  endInMs: number,
  step: number,
  responsePredicate: ResponsePredicate<T>,
  namespace: string,
  fetchOptions: Partial<FetchOptions> | undefined,
  post: PrometheusPostFn,
): [...FetchState<T[]>, boolean] => {
  const pendingRef = React.useRef(active);
  const fetchData = React.useCallback<FetchStateCallbackPromise<T[]>>(() => {
    const endInS = endInMs / 1000;
    const start = endInS - span;

    if (!active) {
      return Promise.reject(new NotReadyError('Prometheus query is not active'));
    }

    return post(apiPath, {
      query: new URLSearchParams({
        namespace,
        query: queryLang,
        start: start.toString(),
        end: endInS.toString(),
        step: step.toString(),
      }).toString(),
    })
      .then((response) => responsePredicate(response.response.data))
      .finally(() => {
        pendingRef.current = false;
      });
  }, [endInMs, span, active, apiPath, namespace, queryLang, step, responsePredicate, post]);

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

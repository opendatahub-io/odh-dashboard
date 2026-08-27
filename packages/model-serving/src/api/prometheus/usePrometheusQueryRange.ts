import type { FetchOptions, FetchState } from '@odh-dashboard/ui-core/hooks/useFetchState';
import type {
  PrometheusQueryRangeResponse,
  PrometheusQueryRangeResultValue,
} from '@odh-dashboard/ui-core/types/metrics';
import baseUsePrometheusQueryRange, {
  type PrometheusPostFn,
  type ResponsePredicate,
} from '@odh-dashboard/ui-core/utilities/metrics/usePrometheusQueryRange';
import axios from '@odh-dashboard/internal/utilities/axios';

export type { ResponsePredicate } from '@odh-dashboard/ui-core/utilities/metrics/usePrometheusQueryRange';
export {
  defaultResponsePredicate,
  prometheusQueryRangeResponsePredicate,
} from '@odh-dashboard/ui-core/utilities/metrics/usePrometheusQueryRange';

const axiosPost: PrometheusPostFn = (url, body) =>
  axios
    .post<{ response: PrometheusQueryRangeResponse }>(url, body)
    .then((response) => response.data);

/**
 * Model-serving wrapper that binds the dashboard's authenticated axios instance to
 * the ui-core base hook. The transport is sourced from the host frontend
 * (`@odh-dashboard/internal/utilities/axios`) so requests keep cookies, CSRF, and
 * `x-odh-feature-flags`.
 */
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
): [...FetchState<T[]>, boolean] =>
  baseUsePrometheusQueryRange<T>(
    active,
    apiPath,
    queryLang,
    span,
    endInMs,
    step,
    responsePredicate,
    namespace,
    fetchOptions,
    axiosPost,
  );

export default usePrometheusQueryRange;

import type { FetchOptions, FetchState } from '@odh-dashboard/ui-core/hooks/useFetchState';
import type {
  PrometheusQueryRangeResponse,
  PrometheusQueryRangeResultValue,
} from '@odh-dashboard/ui-core/types/metrics';
import baseUsePrometheusQueryRange, {
  type PrometheusPostFn,
  type ResponsePredicate,
} from '@odh-dashboard/ui-core/utilities/metrics/usePrometheusQueryRange';
import axios from '#~/utilities/axios';

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
 * Frontend-specific wrapper that binds the dashboard's axios instance.
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

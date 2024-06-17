import { TimeframeTitle } from '~/concepts/metrics/types';
import { TimeframeStep, TimeframeTimeRange } from '~/concepts/metrics/const';
import { PendingContextResourceData, PrometheusQueryRangeResultValue } from '~/types';
import useRestructureContextResourceData from '~/utilities/useRestructureContextResourceData';
import { FetchOptions } from '~/utilities/useFetchState';
import usePrometheusQueryRange, { ResponsePredicate } from './usePrometheusQueryRange';

const useQueryRangeResourceData = <T = PrometheusQueryRangeResultValue>(
  /** Is the query active -- should we be fetching? */
  active: boolean,
  query: string,
  end: number,
  timeframe: TimeframeTitle,
  responsePredicate: ResponsePredicate<T>,
  namespace: string,
  apiPath = '/api/prometheus/serving',
  fetchOptions?: Partial<FetchOptions>,
): PendingContextResourceData<T> =>
  useRestructureContextResourceData<T>(
    usePrometheusQueryRange<T>(
      active,
      apiPath,
      query,
      TimeframeTimeRange[timeframe],
      end,
      TimeframeStep[timeframe],
      responsePredicate,
      namespace,
      fetchOptions,
    ),
  );

export default useQueryRangeResourceData;

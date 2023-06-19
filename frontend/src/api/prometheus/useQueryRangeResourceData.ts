import {
  RefreshIntervalValue,
  TimeframeStep,
  TimeframeTimeRange,
} from '~/pages/modelServing/screens/const';
import { RefreshIntervalTitle, TimeframeTitle } from '~/pages/modelServing/screens/types';
import { ContextResourceData, PrometheusQueryRangeResultValue } from '~/types';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import usePrometheusQueryRange, { ResponsePredicate } from './usePrometheusQueryRange';

const useQueryRangeResourceData = <T = PrometheusQueryRangeResultValue>(
  /** Is the query active -- should we be fetching? */
  active: boolean,
  query: string,
  end: number,
  timeframe: TimeframeTitle,
  refreshInterval: RefreshIntervalTitle,
  responsePredicate: ResponsePredicate<T>,
): ContextResourceData<T> =>
  useContextResourceData<T>(
    usePrometheusQueryRange<T>(
      active,
      '/api/prometheus/serving',
      query,
      TimeframeTimeRange[timeframe],
      end,
      TimeframeStep[timeframe],
      responsePredicate,
    ),
    RefreshIntervalValue[refreshInterval],
  );

export default useQueryRangeResourceData;

import { TimeframeStep, TimeframeTimeRange } from '~/pages/modelServing/screens/const';
import { PrometheusQueryRangeResultValue } from '~/types';
import useRestructureContextResourceData from '~/utilities/useRestructureContextResourceData';
import { TimeframeTitle } from '~/pages/modelServing/screens/types';
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
): ReturnType<typeof useRestructureContextResourceData<T>> =>
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
    ),
  );

export default useQueryRangeResourceData;

import { TimeframeTimeRange } from '~/pages/modelServing/screens/const';
import { ContextResourceData, PrometheusQueryRangeResultValue } from '~/types';
import useRestructureContextResourceData from '~/utilities/useRestructureContextResourceData';
import { TimeframeStepType, TimeframeTitle } from '~/pages/modelServing/screens/types';
import usePrometheusQueryRange, { ResponsePredicate } from './usePrometheusQueryRange';

const useQueryRangeResourceData = <T = PrometheusQueryRangeResultValue>(
  /** Is the query active -- should we be fetching? */
  active: boolean,
  query: string,
  end: number,
  timeframe: TimeframeTitle,
  timeframeStep: TimeframeStepType,
  responsePredicate: ResponsePredicate<T>,
  apiPath = '/api/prometheus/serving',
): ContextResourceData<T> =>
  useRestructureContextResourceData<T>(
    usePrometheusQueryRange<T>(
      active,
      apiPath,
      query,
      TimeframeTimeRange[timeframe],
      end,
      timeframeStep[timeframe],
      responsePredicate,
    ),
  );

export default useQueryRangeResourceData;

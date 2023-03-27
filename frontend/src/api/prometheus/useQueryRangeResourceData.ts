import { TimeframeStep, TimeframeTimeRange } from '~/pages/modelServing/screens/const';
import { TimeframeTitle } from '~/pages/modelServing/screens/types';
import { ContextResourceData, PrometheusQueryRangeResultValue } from '~/types';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import usePrometheusQueryRange from './usePrometheusQueryRange';

const useQueryRangeResourceData = (
  /** Is the query active -- should we be fetching? */
  active: boolean,
  query: string,
  end: number,
  timeframe: TimeframeTitle,
): ContextResourceData<PrometheusQueryRangeResultValue> =>
  useContextResourceData<PrometheusQueryRangeResultValue>(
    usePrometheusQueryRange(
      active,
      '/api/prometheus/serving',
      query,
      TimeframeTimeRange[timeframe],
      end,
      TimeframeStep[timeframe],
    ),
    5 * 60 * 1000,
  );

export default useQueryRangeResourceData;

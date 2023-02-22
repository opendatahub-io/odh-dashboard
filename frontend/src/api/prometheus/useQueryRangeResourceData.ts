import { TimeframeStep, TimeframeTime } from '../../pages/modelServing/screens/const';
import { TimeframeTitle } from '../../pages/modelServing/screens/types';
import { ContextResourceData, PrometheusQueryRangeResultValue } from '../../types';
import { useContextResourceData } from '../../utilities/useContextResourceData';
import usePrometheusQueryRange from './usePrometheusQueryRange';

const useQueryRangeResourceData = (
  query: string,
  end: number,
  timeframe: TimeframeTitle,
): ContextResourceData<PrometheusQueryRangeResultValue> =>
  useContextResourceData<PrometheusQueryRangeResultValue>(
    usePrometheusQueryRange(
      '/api/prometheus/serving',
      query,
      TimeframeTime[timeframe],
      end,
      TimeframeStep[timeframe],
    ),
    5 * 60 * 1000,
  );

export default useQueryRangeResourceData;

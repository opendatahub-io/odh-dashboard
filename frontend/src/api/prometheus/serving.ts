import * as React from 'react';
import { ContextResourceData, PrometheusQueryRangeResultValue } from '../../types';
import { ModelServingMetricType } from '../../pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { TimeframeTitle } from '../../pages/modelServing/screens/types';
import useQueryRangeResourceData from './useQueryRangeResourceData';

export const useModelServingMetrics = (
  queries: Record<ModelServingMetricType, string>,
  timeframe: TimeframeTitle,
  lastUpdateTime: number,
  setLastUpdateTime: (time: number) => void,
): {
  data: Record<ModelServingMetricType, ContextResourceData<PrometheusQueryRangeResultValue>>;
  refresh: () => void;
} => {
  const [end, setEnd] = React.useState(lastUpdateTime);

  const endpointHealth = useQueryRangeResourceData(
    queries[ModelServingMetricType.ENDPOINT_HEALTH],
    end,
    timeframe,
  );
  const inferencePerformance = useQueryRangeResourceData(
    queries[ModelServingMetricType.INFERENCE_PERFORMANCE],
    end,
    timeframe,
  );
  const averageResponseTime = useQueryRangeResourceData(
    queries[ModelServingMetricType.AVG_RESPONSE_TIME],
    end,
    timeframe,
  );
  const requestCount = useQueryRangeResourceData(
    queries[ModelServingMetricType.REQUEST_COUNT],
    end,
    timeframe,
  );
  const failedRequestCount = useQueryRangeResourceData(
    queries[ModelServingMetricType.FAILED_REQUEST_COUNT],
    end,
    timeframe,
  );

  React.useEffect(() => {
    setLastUpdateTime(Date.now());
    // re-compute lastUpdateTime when data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpointHealth, inferencePerformance, averageResponseTime, requestCount, failedRequestCount]);

  const refreshAllMetrics = React.useCallback(() => {
    setEnd(Date.now());
  }, []);

  return React.useMemo(
    () => ({
      data: {
        [ModelServingMetricType.ENDPOINT_HEALTH]: endpointHealth,
        [ModelServingMetricType.INFERENCE_PERFORMANCE]: inferencePerformance,
        [ModelServingMetricType.AVG_RESPONSE_TIME]: averageResponseTime,
        [ModelServingMetricType.REQUEST_COUNT]: requestCount,
        [ModelServingMetricType.FAILED_REQUEST_COUNT]: failedRequestCount,
      },
      refresh: refreshAllMetrics,
    }),
    [
      endpointHealth,
      inferencePerformance,
      averageResponseTime,
      requestCount,
      failedRequestCount,
      refreshAllMetrics,
    ],
  );
};

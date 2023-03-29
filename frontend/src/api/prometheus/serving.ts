import * as React from 'react';
import { ContextResourceData, PrometheusQueryRangeResultValue } from '~/types';
import {
  InferenceMetricType,
  RuntimeMetricType,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { MetricType, TimeframeTitle } from '~/pages/modelServing/screens/types';
import useQueryRangeResourceData, {
  useQueryRangeResourceDataTrusty,
} from './useQueryRangeResourceData';

export const useModelServingMetrics = (
  type: MetricType,
  queries: Record<RuntimeMetricType, string> | Record<InferenceMetricType, string>,
  timeframe: TimeframeTitle,
  lastUpdateTime: number,
  setLastUpdateTime: (time: number) => void,
): {
  data: Record<RuntimeMetricType, ContextResourceData<PrometheusQueryRangeResultValue>>;
  refresh: () => void;
} => {
  const [end, setEnd] = React.useState(lastUpdateTime);

  const runtimeRequestCount = useQueryRangeResourceData(
    type === 'runtime',
    queries[RuntimeMetricType.REQUEST_COUNT],
    end,
    timeframe,
  );

  const runtimeAverageResponseTime = useQueryRangeResourceData(
    type === 'runtime',
    queries[RuntimeMetricType.AVG_RESPONSE_TIME],
    end,
    timeframe,
  );

  const runtimeCPUUtilization = useQueryRangeResourceData(
    type === 'runtime',
    queries[RuntimeMetricType.CPU_UTILIZATION],
    end,
    timeframe,
  );

  const runtimeMemoryUtilization = useQueryRangeResourceData(
    type === 'runtime',
    queries[RuntimeMetricType.MEMORY_UTILIZATION],
    end,
    timeframe,
  );

  const inferenceRequestSuccessCount = useQueryRangeResourceData(
    type === 'inference',
    queries[InferenceMetricType.REQUEST_COUNT_SUCCESS],
    end,
    timeframe,
  );

  const inferenceRequestFailedCount = useQueryRangeResourceData(
    type === 'inference',
    queries[InferenceMetricType.REQUEST_COUNT_FAILED],
    end,
    timeframe,
  );

  const inferenceTrustyAISPD = useQueryRangeResourceDataTrusty(
    type === 'inference',
    queries[InferenceMetricType.TRUSTY_AI_SPD],
    end,
    timeframe,
  );

  const inferenceTrustyAIDIR = useQueryRangeResourceDataTrusty(
    type === 'inference',
    queries[InferenceMetricType.TRUSTY_AI_DIR],
    end,
    timeframe,
  );

  React.useEffect(() => {
    setLastUpdateTime(Date.now());
    // re-compute lastUpdateTime when data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    runtimeRequestCount,
    runtimeAverageResponseTime,
    runtimeCPUUtilization,
    runtimeMemoryUtilization,
    inferenceRequestSuccessCount,
    inferenceRequestFailedCount,
  ]);

  const refreshAllMetrics = React.useCallback(() => {
    setEnd(Date.now());
  }, []);

  return React.useMemo(
    () => ({
      data: {
        [RuntimeMetricType.REQUEST_COUNT]: runtimeRequestCount,
        [RuntimeMetricType.AVG_RESPONSE_TIME]: runtimeAverageResponseTime,
        [RuntimeMetricType.CPU_UTILIZATION]: runtimeCPUUtilization,
        [RuntimeMetricType.MEMORY_UTILIZATION]: runtimeMemoryUtilization,
        [InferenceMetricType.REQUEST_COUNT_SUCCESS]: inferenceRequestSuccessCount,
        [InferenceMetricType.REQUEST_COUNT_FAILED]: inferenceRequestFailedCount,
        [InferenceMetricType.TRUSTY_AI_SPD]: inferenceTrustyAISPD,
        [InferenceMetricType.TRUSTY_AI_DIR]: inferenceTrustyAIDIR,
      },
      refresh: refreshAllMetrics,
    }),
    [
      runtimeRequestCount,
      runtimeAverageResponseTime,
      runtimeCPUUtilization,
      runtimeMemoryUtilization,
      inferenceRequestSuccessCount,
      inferenceRequestFailedCount,
      inferenceTrustyAISPD,
      inferenceTrustyAIDIR,
      refreshAllMetrics,
    ],
  );
};

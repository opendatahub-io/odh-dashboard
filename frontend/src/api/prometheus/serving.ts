import * as React from 'react';
import {
  ContextResourceData,
  PrometheusQueryRangeResponseDataResult,
  PrometheusQueryRangeResultValue,
} from '~/types';
import {
  InferenceMetricType,
  RuntimeMetricType,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import {
  MetricType,
  RefreshIntervalTitle,
  TimeframeTitle,
} from '~/pages/modelServing/screens/types';
import useBiasMetricsEnabled from '~/concepts/explainability/useBiasMetricsEnabled';
import { ResponsePredicate } from '~/api/prometheus/usePrometheusQueryRange';
import useRefreshInterval from '~/utilities/useRefreshInterval';
import { RefreshIntervalValue } from '~/pages/modelServing/screens/const';
import useQueryRangeResourceData from './useQueryRangeResourceData';

export const useModelServingMetrics = (
  type: MetricType,
  queries: Record<RuntimeMetricType, string> | Record<InferenceMetricType, string>,
  timeframe: TimeframeTitle,
  lastUpdateTime: number,
  setLastUpdateTime: (time: number) => void,
  refreshInterval: RefreshIntervalTitle,
): {
  data: Record<
    RuntimeMetricType | InferenceMetricType,
    ContextResourceData<PrometheusQueryRangeResultValue | PrometheusQueryRangeResponseDataResult>
  >;
  refresh: () => void;
} => {
  const [end, setEnd] = React.useState(lastUpdateTime);
  const [biasMetricsEnabled] = useBiasMetricsEnabled();

  const defaultResponsePredicate = React.useCallback<ResponsePredicate>(
    (data) => data.result?.[0]?.values || [],
    [],
  );

  const trustyResponsePredicate = React.useCallback<
    ResponsePredicate<PrometheusQueryRangeResponseDataResult>
  >((data) => data.result, []);

  const runtimeRequestCount = useQueryRangeResourceData(
    type === 'runtime',
    queries[RuntimeMetricType.REQUEST_COUNT],
    end,
    timeframe,
    refreshInterval,
    defaultResponsePredicate,
  );

  const runtimeAverageResponseTime = useQueryRangeResourceData(
    type === 'runtime',
    queries[RuntimeMetricType.AVG_RESPONSE_TIME],
    end,
    timeframe,
    refreshInterval,
    defaultResponsePredicate,
  );

  const runtimeCPUUtilization = useQueryRangeResourceData(
    type === 'runtime',
    queries[RuntimeMetricType.CPU_UTILIZATION],
    end,
    timeframe,
    refreshInterval,
    defaultResponsePredicate,
  );

  const runtimeMemoryUtilization = useQueryRangeResourceData(
    type === 'runtime',
    queries[RuntimeMetricType.MEMORY_UTILIZATION],
    end,
    timeframe,
    refreshInterval,
    defaultResponsePredicate,
  );

  const inferenceRequestSuccessCount = useQueryRangeResourceData(
    type === 'inference',
    queries[InferenceMetricType.REQUEST_COUNT_SUCCESS],
    end,
    timeframe,
    refreshInterval,
    defaultResponsePredicate,
  );

  const inferenceRequestFailedCount = useQueryRangeResourceData(
    type === 'inference',
    queries[InferenceMetricType.REQUEST_COUNT_FAILED],
    end,
    timeframe,
    refreshInterval,
    defaultResponsePredicate,
  );

  const inferenceTrustyAISPD = useQueryRangeResourceData(
    biasMetricsEnabled && type === 'inference',
    queries[InferenceMetricType.TRUSTY_AI_SPD],
    end,
    timeframe,
    refreshInterval,
    trustyResponsePredicate,
  );

  const inferenceTrustyAIDIR = useQueryRangeResourceData(
    biasMetricsEnabled && type === 'inference',
    queries[InferenceMetricType.TRUSTY_AI_DIR],
    end,
    timeframe,
    refreshInterval,
    trustyResponsePredicate,
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
    inferenceTrustyAIDIR,
    inferenceTrustyAISPD,
  ]);

  const refreshAllMetrics = React.useCallback(() => {
    setEnd(Date.now());
  }, []);

  useRefreshInterval(RefreshIntervalValue[refreshInterval], refreshAllMetrics);

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

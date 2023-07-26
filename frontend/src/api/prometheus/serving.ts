import * as React from 'react';
import {
  ContextResourceData,
  PrometheusQueryRangeResponseDataResult,
  PrometheusQueryRangeResultValue,
} from '~/types';
import {
  ModelMetricType,
  ServerMetricType,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import {
  PerformanceMetricType,
  RefreshIntervalTitle,
  TimeframeTitle,
} from '~/pages/modelServing/screens/types';
import useBiasMetricsEnabled from '~/concepts/explainability/useBiasMetricsEnabled';
import { ResponsePredicate } from '~/api/prometheus/usePrometheusQueryRange';
import useRefreshInterval from '~/utilities/useRefreshInterval';
import { QueryTimeframeStep, RefreshIntervalValue } from '~/pages/modelServing/screens/const';
import usePerformanceMetricsEnabled from '~/pages/modelServing/screens/metrics/usePerformanceMetricsEnabled';
import useQueryRangeResourceData from './useQueryRangeResourceData';

export const useModelServingMetrics = (
  type: PerformanceMetricType,
  queries: Record<ServerMetricType, string> | Record<ModelMetricType, string>,
  timeframe: TimeframeTitle,
  lastUpdateTime: number,
  setLastUpdateTime: (time: number) => void,
  refreshInterval: RefreshIntervalTitle,
): {
  data: Record<
    ServerMetricType | ModelMetricType,
    ContextResourceData<PrometheusQueryRangeResultValue | PrometheusQueryRangeResponseDataResult>
  >;
  refresh: () => void;
} => {
  const [end, setEnd] = React.useState(lastUpdateTime);
  const [biasMetricsEnabled] = useBiasMetricsEnabled();
  const [performanceMetricsEnabled] = usePerformanceMetricsEnabled();

  const defaultResponsePredicate = React.useCallback<ResponsePredicate>(
    (data) => data.result?.[0]?.values || [],
    [],
  );

  const trustyResponsePredicate = React.useCallback<
    ResponsePredicate<PrometheusQueryRangeResponseDataResult>
  >((data) => data.result || [], []);

  const serverRequestCount = useQueryRangeResourceData(
    performanceMetricsEnabled && type === PerformanceMetricType.SERVER,
    queries[ServerMetricType.REQUEST_COUNT],
    end,
    timeframe,
    QueryTimeframeStep[ServerMetricType.REQUEST_COUNT],
    defaultResponsePredicate,
  );

  const serverAverageResponseTime =
    useQueryRangeResourceData<PrometheusQueryRangeResponseDataResult>(
      performanceMetricsEnabled && type === PerformanceMetricType.SERVER,
      queries[ServerMetricType.AVG_RESPONSE_TIME],
      end,
      timeframe,
      QueryTimeframeStep[ServerMetricType.AVG_RESPONSE_TIME],
      trustyResponsePredicate,
    );

  const serverCPUUtilization = useQueryRangeResourceData(
    performanceMetricsEnabled && type === PerformanceMetricType.SERVER,
    queries[ServerMetricType.CPU_UTILIZATION],
    end,
    timeframe,
    QueryTimeframeStep[ServerMetricType.CPU_UTILIZATION],
    defaultResponsePredicate,
  );

  const serverMemoryUtilization = useQueryRangeResourceData(
    performanceMetricsEnabled && type === PerformanceMetricType.SERVER,
    queries[ServerMetricType.MEMORY_UTILIZATION],
    end,
    timeframe,
    QueryTimeframeStep[ServerMetricType.MEMORY_UTILIZATION],
    defaultResponsePredicate,
  );

  const modelRequestSuccessCount = useQueryRangeResourceData(
    performanceMetricsEnabled && type === PerformanceMetricType.MODEL,
    queries[ModelMetricType.REQUEST_COUNT_SUCCESS],
    end,
    timeframe,
    QueryTimeframeStep[ModelMetricType.REQUEST_COUNT_SUCCESS],
    defaultResponsePredicate,
  );

  const modelRequestFailedCount = useQueryRangeResourceData(
    performanceMetricsEnabled && type === PerformanceMetricType.MODEL,
    queries[ModelMetricType.REQUEST_COUNT_FAILED],
    end,
    timeframe,
    QueryTimeframeStep[ModelMetricType.REQUEST_COUNT_FAILED],
    defaultResponsePredicate,
  );

  const modelTrustyAISPD = useQueryRangeResourceData(
    biasMetricsEnabled && type === PerformanceMetricType.MODEL,
    queries[ModelMetricType.TRUSTY_AI_SPD],
    end,
    timeframe,
    QueryTimeframeStep[ModelMetricType.TRUSTY_AI_SPD],
    trustyResponsePredicate,
    '/api/prometheus/bias',
  );

  const modelTrustyAIDIR = useQueryRangeResourceData(
    biasMetricsEnabled && type === PerformanceMetricType.MODEL,
    queries[ModelMetricType.TRUSTY_AI_DIR],
    end,
    timeframe,
    QueryTimeframeStep[ModelMetricType.TRUSTY_AI_DIR],
    trustyResponsePredicate,
    '/api/prometheus/bias',
  );

  React.useEffect(() => {
    setLastUpdateTime(Date.now());
    // re-compute lastUpdateTime when data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    serverRequestCount,
    serverAverageResponseTime,
    serverCPUUtilization,
    serverMemoryUtilization,
    modelRequestSuccessCount,
    modelRequestFailedCount,
    modelTrustyAIDIR,
    modelTrustyAISPD,
  ]);

  const refreshAllMetrics = React.useCallback(() => {
    setEnd(Date.now());
  }, []);

  useRefreshInterval(RefreshIntervalValue[refreshInterval], refreshAllMetrics);

  return React.useMemo(
    () => ({
      data: {
        [ServerMetricType.REQUEST_COUNT]: serverRequestCount,
        [ServerMetricType.AVG_RESPONSE_TIME]: serverAverageResponseTime,
        [ServerMetricType.CPU_UTILIZATION]: serverCPUUtilization,
        [ServerMetricType.MEMORY_UTILIZATION]: serverMemoryUtilization,
        [ModelMetricType.REQUEST_COUNT_SUCCESS]: modelRequestSuccessCount,
        [ModelMetricType.REQUEST_COUNT_FAILED]: modelRequestFailedCount,
        [ModelMetricType.TRUSTY_AI_SPD]: modelTrustyAISPD,
        [ModelMetricType.TRUSTY_AI_DIR]: modelTrustyAIDIR,
      },
      refresh: refreshAllMetrics,
    }),
    [
      serverRequestCount,
      serverAverageResponseTime,
      serverCPUUtilization,
      serverMemoryUtilization,
      modelRequestSuccessCount,
      modelRequestFailedCount,
      modelTrustyAIDIR,
      modelTrustyAISPD,
      refreshAllMetrics,
    ],
  );
};

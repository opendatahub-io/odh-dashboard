import * as React from 'react';
import { PrometheusQueryRangeResponseDataResult, PrometheusQueryRangeResultValue } from '#~/types';
import { FetchStateObject } from '#~/utilities/useFetch';
import { ModelMetricType } from '#~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { PerformanceMetricType } from '#~/pages/modelServing/screens/types';
import { RefreshIntervalTitle, TimeframeTitle } from '#~/concepts/metrics/types';
import { RefreshIntervalValue } from '#~/concepts/metrics/const';
import useRefreshInterval from '#~/utilities/useRefreshInterval';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { PROMETHEUS_BIAS_PATH } from '#~/api/prometheus/const';
import useQueryRangeResourceData from './useQueryRangeResourceData';
import {
  defaultResponsePredicate,
  prometheusQueryRangeResponsePredicate,
} from './usePrometheusQueryRange';

export const useModelServingMetrics = (
  type: PerformanceMetricType,
  queries: { [key in ModelMetricType]: string },
  timeframe: TimeframeTitle,
  lastUpdateTime: number,
  setLastUpdateTime: (time: number) => void,
  refreshInterval: RefreshIntervalTitle,
  namespace: string,
): {
  data: {
    [ModelMetricType.REQUEST_COUNT_FAILED]: FetchStateObject<PrometheusQueryRangeResultValue[]>;
    [ModelMetricType.REQUEST_COUNT_SUCCESS]: FetchStateObject<PrometheusQueryRangeResultValue[]>;
    [ModelMetricType.TRUSTY_AI_SPD]: FetchStateObject<PrometheusQueryRangeResponseDataResult[]>;
    [ModelMetricType.TRUSTY_AI_DIR]: FetchStateObject<PrometheusQueryRangeResponseDataResult[]>;
  };
  refresh: () => void;
} => {
  const [end, setEnd] = React.useState(lastUpdateTime);
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  const performanceMetricsAreaAvailable = useIsAreaAvailable(
    SupportedArea.PERFORMANCE_METRICS,
  ).status;

  const modelRequestSuccessCount = useQueryRangeResourceData(
    performanceMetricsAreaAvailable && type === PerformanceMetricType.MODEL,
    queries[ModelMetricType.REQUEST_COUNT_SUCCESS],
    end,
    timeframe,
    defaultResponsePredicate,
    namespace,
  );

  const modelRequestFailedCount = useQueryRangeResourceData(
    performanceMetricsAreaAvailable && type === PerformanceMetricType.MODEL,
    queries[ModelMetricType.REQUEST_COUNT_FAILED],
    end,
    timeframe,
    defaultResponsePredicate,
    namespace,
  );

  const modelTrustyAISPD = useQueryRangeResourceData(
    biasMetricsAreaAvailable && type === PerformanceMetricType.MODEL,
    queries[ModelMetricType.TRUSTY_AI_SPD],
    end,
    timeframe,
    prometheusQueryRangeResponsePredicate,
    namespace,
    PROMETHEUS_BIAS_PATH,
  );

  const modelTrustyAIDIR = useQueryRangeResourceData(
    biasMetricsAreaAvailable && type === PerformanceMetricType.MODEL,
    queries[ModelMetricType.TRUSTY_AI_DIR],
    end,
    timeframe,
    prometheusQueryRangeResponsePredicate,
    namespace,
    PROMETHEUS_BIAS_PATH,
  );

  React.useEffect(() => {
    setLastUpdateTime(Date.now());
    // re-compute lastUpdateTime when data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelRequestSuccessCount, modelRequestFailedCount, modelTrustyAIDIR, modelTrustyAISPD]);

  const refreshAllMetrics = React.useCallback(() => {
    setEnd(Date.now());
  }, []);

  useRefreshInterval(RefreshIntervalValue[refreshInterval], refreshAllMetrics);

  const result = React.useMemo(
    () => ({
      data: {
        [ModelMetricType.REQUEST_COUNT_SUCCESS]: modelRequestSuccessCount,
        [ModelMetricType.REQUEST_COUNT_FAILED]: modelRequestFailedCount,
        [ModelMetricType.TRUSTY_AI_SPD]: modelTrustyAISPD,
        [ModelMetricType.TRUSTY_AI_DIR]: modelTrustyAIDIR,
      },
      refresh: refreshAllMetrics,
    }),
    [
      modelRequestSuccessCount,
      modelRequestFailedCount,
      modelTrustyAIDIR,
      modelTrustyAISPD,
      refreshAllMetrics,
    ],
  );

  // store the result in a reference and only update the reference so long as there are no pending queries
  const resultRef = React.useRef(result);
  if (
    !(
      modelRequestSuccessCount.pending ||
      modelRequestFailedCount.pending ||
      modelTrustyAIDIR.pending ||
      modelTrustyAISPD.pending
    )
  ) {
    resultRef.current = result;
  }
  return resultRef.current;
};

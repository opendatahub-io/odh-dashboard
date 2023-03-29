import * as React from 'react';
import { useModelServingMetrics } from '~/api';
import { ContextResourceData, PrometheusQueryRangeResultValue } from '~/types';
import { DEFAULT_CONTEXT_DATA } from '~/utilities/const';
import { MetricType, TimeframeTitle } from '~/pages/modelServing/screens/types';

export enum RuntimeMetricType {
  AVG_RESPONSE_TIME = 'runtime_avg-response-time',
  REQUEST_COUNT = 'runtime_requests-count',
  CPU_UTILIZATION = 'runtime_cpu-utilization',
  MEMORY_UTILIZATION = 'runtime_memory-utilization',
}

export enum InferenceMetricType {
  REQUEST_COUNT_SUCCESS = 'inference_request-count-successes',
  REQUEST_COUNT_FAILED = 'inference_request-count-fails',
  TRUSTY_AI_SPD = 'trustyai_spd',
  TRUSTY_AI_DIR = 'trustyai_dir',
}

type ModelServingMetricsContext = {
  data: Record<
    RuntimeMetricType & InferenceMetricType,
    ContextResourceData<PrometheusQueryRangeResultValue>
  >;
  currentTimeframe: TimeframeTitle;
  setCurrentTimeframe: (timeframe: TimeframeTitle) => void;
  refresh: () => void;
  lastUpdateTime: number;
  setLastUpdateTime: (time: number) => void;
};

export const ModelServingMetricsContext = React.createContext<ModelServingMetricsContext>({
  data: {
    [RuntimeMetricType.REQUEST_COUNT]: DEFAULT_CONTEXT_DATA,
    [RuntimeMetricType.AVG_RESPONSE_TIME]: DEFAULT_CONTEXT_DATA,
    [RuntimeMetricType.CPU_UTILIZATION]: DEFAULT_CONTEXT_DATA,
    [RuntimeMetricType.MEMORY_UTILIZATION]: DEFAULT_CONTEXT_DATA,
    [InferenceMetricType.REQUEST_COUNT_FAILED]: DEFAULT_CONTEXT_DATA,
    [InferenceMetricType.REQUEST_COUNT_SUCCESS]: DEFAULT_CONTEXT_DATA,
    [InferenceMetricType.TRUSTY_AI_SPD]: DEFAULT_CONTEXT_DATA,
    [InferenceMetricType.TRUSTY_AI_DIR]: DEFAULT_CONTEXT_DATA,
  },
  currentTimeframe: TimeframeTitle.ONE_HOUR,
  setCurrentTimeframe: () => undefined,
  refresh: () => undefined,
  lastUpdateTime: 0,
  setLastUpdateTime: () => undefined,
});

type ModelServingMetricsProviderProps = {
  children: React.ReactNode;
  /** Prometheus query strings computed and ready to use */
  queries: Record<RuntimeMetricType, string> | Record<InferenceMetricType, string>;
  type: MetricType;
};

export const ModelServingMetricsProvider: React.FC<ModelServingMetricsProviderProps> = ({
  queries,
  children,
  type,
}) => {
  const [currentTimeframe, setCurrentTimeframe] = React.useState<TimeframeTitle>(
    TimeframeTitle.ONE_DAY,
  );
  const [lastUpdateTime, setLastUpdateTime] = React.useState<number>(Date.now());

  const { data, refresh } = useModelServingMetrics(
    type,
    queries,
    currentTimeframe,
    lastUpdateTime,
    setLastUpdateTime,
  );

  return (
    <ModelServingMetricsContext.Provider
      value={{
        data,
        currentTimeframe,
        setCurrentTimeframe,
        refresh,
        lastUpdateTime,
        setLastUpdateTime,
      }}
    >
      {children}
    </ModelServingMetricsContext.Provider>
  );
};

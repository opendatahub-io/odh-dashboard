import * as React from 'react';
import { useModelServingMetrics } from '~/api';
import { ContextResourceData, PrometheusQueryRangeResultValue } from '~/types';
import { DEFAULT_CONTEXT_DATA } from '~/utilities/const';
import {
  PerformanceMetricType,
  RefreshIntervalTitle,
  TimeframeTitle,
} from '~/pages/modelServing/screens/types';

export enum ServerMetricType {
  AVG_RESPONSE_TIME = 'runtime_avg-response-time',
  REQUEST_COUNT = 'runtime_requests-count',
  CPU_UTILIZATION = 'runtime_cpu-utilization',
  MEMORY_UTILIZATION = 'runtime_memory-utilization',
}

export enum ModelMetricType {
  REQUEST_COUNT_SUCCESS = 'inference_request-count-successes',
  REQUEST_COUNT_FAILED = 'inference_request-count-fails',
  TRUSTY_AI_SPD = 'trustyai_spd',
  TRUSTY_AI_DIR = 'trustyai_dir',
}

type ModelServingMetricsContext = {
  data: Record<
    ModelMetricType & ServerMetricType,
    ContextResourceData<PrometheusQueryRangeResultValue>
  >;
  currentTimeframe: TimeframeTitle;
  setCurrentTimeframe: (timeframe: TimeframeTitle) => void;
  currentRefreshInterval: RefreshIntervalTitle;
  setCurrentRefreshInterval: (interval: RefreshIntervalTitle) => void;
  refresh: () => void;
  lastUpdateTime: number;
  setLastUpdateTime: (time: number) => void;
};

export const ModelServingMetricsContext = React.createContext<ModelServingMetricsContext>({
  data: {
    [ServerMetricType.REQUEST_COUNT]: DEFAULT_CONTEXT_DATA,
    [ServerMetricType.AVG_RESPONSE_TIME]: DEFAULT_CONTEXT_DATA,
    [ServerMetricType.CPU_UTILIZATION]: DEFAULT_CONTEXT_DATA,
    [ServerMetricType.MEMORY_UTILIZATION]: DEFAULT_CONTEXT_DATA,
    [ModelMetricType.REQUEST_COUNT_FAILED]: DEFAULT_CONTEXT_DATA,
    [ModelMetricType.REQUEST_COUNT_SUCCESS]: DEFAULT_CONTEXT_DATA,
    [ModelMetricType.TRUSTY_AI_SPD]: DEFAULT_CONTEXT_DATA,
    [ModelMetricType.TRUSTY_AI_DIR]: DEFAULT_CONTEXT_DATA,
  },
  currentTimeframe: TimeframeTitle.ONE_HOUR,
  setCurrentTimeframe: () => undefined,
  currentRefreshInterval: RefreshIntervalTitle.FIVE_MINUTES,
  setCurrentRefreshInterval: () => undefined,
  refresh: () => undefined,
  lastUpdateTime: 0,
  setLastUpdateTime: () => undefined,
});

type ModelServingMetricsProviderProps = {
  children: React.ReactNode;
  /** Prometheus query strings computed and ready to use */
  queries: Record<ServerMetricType, string> | Record<ModelMetricType, string>;
  type: PerformanceMetricType;
};

export const ModelServingMetricsProvider: React.FC<ModelServingMetricsProviderProps> = ({
  queries,
  children,
  type,
}) => {
  const [currentTimeframe, setCurrentTimeframe] = React.useState<TimeframeTitle>(
    TimeframeTitle.ONE_DAY,
  );

  const [currentRefreshInterval, setCurrentRefreshInterval] = React.useState<RefreshIntervalTitle>(
    RefreshIntervalTitle.FIVE_MINUTES,
  );
  const [lastUpdateTime, setLastUpdateTime] = React.useState<number>(Date.now());

  const { data, refresh } = useModelServingMetrics(
    type,
    queries,
    currentTimeframe,
    lastUpdateTime,
    setLastUpdateTime,
    currentRefreshInterval,
  );

  return (
    <ModelServingMetricsContext.Provider
      value={{
        data,
        currentTimeframe,
        setCurrentTimeframe,
        currentRefreshInterval,
        setCurrentRefreshInterval,
        refresh,
        lastUpdateTime,
        setLastUpdateTime,
      }}
    >
      {children}
    </ModelServingMetricsContext.Provider>
  );
};

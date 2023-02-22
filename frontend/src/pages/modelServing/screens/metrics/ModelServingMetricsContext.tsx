import * as React from 'react';
import { useModelServingMetrics } from '../../../../api/prometheus/serving';
import { ContextResourceData, PrometheusQueryRangeResultValue } from '../../../../types';
import { DEFAULT_CONTEXT_DATA } from '../../../../utilities/const';
import { TimeframeTitle } from '../types';

export enum ModelServingMetricType {
  ENDPOINT_HEALTH = 'end-point-health',
  INFERENCE_PERFORMANCE = 'inference-performance',
  AVG_RESPONSE_TIME = 'avg-response-time',
  REQUEST_COUNT = 'request-count',
  FAILED_REQUEST_COUNT = 'failed-request-count',
}

type ModelServingMetricsContext = {
  data: Record<ModelServingMetricType, ContextResourceData<PrometheusQueryRangeResultValue>>;
  currentTimeframe: TimeframeTitle;
  setCurrentTimeframe: (timeframe: TimeframeTitle) => void;
  refresh: () => void;
  lastUpdateTime: number;
  setLastUpdateTime: (time: number) => void;
};

export const ModelServingMetricsContext = React.createContext<ModelServingMetricsContext>({
  data: {
    [ModelServingMetricType.ENDPOINT_HEALTH]: DEFAULT_CONTEXT_DATA,
    [ModelServingMetricType.INFERENCE_PERFORMANCE]: DEFAULT_CONTEXT_DATA,
    [ModelServingMetricType.AVG_RESPONSE_TIME]: DEFAULT_CONTEXT_DATA,
    [ModelServingMetricType.REQUEST_COUNT]: DEFAULT_CONTEXT_DATA,
    [ModelServingMetricType.FAILED_REQUEST_COUNT]: DEFAULT_CONTEXT_DATA,
  },
  currentTimeframe: TimeframeTitle.FIVE_MINUTES,
  setCurrentTimeframe: () => undefined,
  refresh: () => undefined,
  lastUpdateTime: 0,
  setLastUpdateTime: () => undefined,
});

type ModelServingMetricsProviderProps = {
  children: React.ReactNode;
  /** Prometheus query strings computed and ready to use */
  queries: Record<ModelServingMetricType, string>;
};

export const ModelServingMetricsProvider: React.FC<ModelServingMetricsProviderProps> = ({
  queries,
  children,
}) => {
  const [currentTimeframe, setCurrentTimeframe] = React.useState<TimeframeTitle>(
    TimeframeTitle.ONE_DAY,
  );
  const [lastUpdateTime, setLastUpdateTime] = React.useState<number>(Date.now());

  const { data, refresh } = useModelServingMetrics(
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

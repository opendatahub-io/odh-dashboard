import * as React from 'react';
import { useModelServingMetrics } from '~/api';
import {
  ContextResourceData,
  PrometheusQueryRangeResponseDataResult,
  PrometheusQueryRangeResultValue,
} from '~/types';
import { DEFAULT_CONTEXT_DATA } from '~/utilities/const';
import { PerformanceMetricType } from '~/pages/modelServing/screens/types';
import { MetricsCommonContext } from '~/concepts/metrics/MetricsCommonContext';

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

type ModelServingMetricsContextType = {
  data: {
    [ServerMetricType.REQUEST_COUNT]: ContextResourceData<PrometheusQueryRangeResultValue>;
    [ServerMetricType.AVG_RESPONSE_TIME]: ContextResourceData<PrometheusQueryRangeResponseDataResult>;
    [ServerMetricType.CPU_UTILIZATION]: ContextResourceData<PrometheusQueryRangeResultValue>;
    [ServerMetricType.MEMORY_UTILIZATION]: ContextResourceData<PrometheusQueryRangeResultValue>;
    [ModelMetricType.REQUEST_COUNT_FAILED]: ContextResourceData<PrometheusQueryRangeResultValue>;
    [ModelMetricType.REQUEST_COUNT_SUCCESS]: ContextResourceData<PrometheusQueryRangeResultValue>;
    [ModelMetricType.TRUSTY_AI_SPD]: ContextResourceData<PrometheusQueryRangeResponseDataResult>;
    [ModelMetricType.TRUSTY_AI_DIR]: ContextResourceData<PrometheusQueryRangeResponseDataResult>;
  };
  refresh: () => void;
  namespace: string;
};

export const ModelServingMetricsContext = React.createContext<ModelServingMetricsContextType>({
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
  refresh: () => undefined,
  namespace: '',
});

type ModelServingMetricsProviderProps = {
  children: React.ReactNode;
  /** Prometheus query strings computed and ready to use */
  queries: { [key in ModelMetricType]: string } | { [key in ServerMetricType]: string };
  type: PerformanceMetricType;
  namespace: string;
};

export const ModelServingMetricsProvider: React.FC<ModelServingMetricsProviderProps> = ({
  queries,
  children,
  type,
  namespace,
}) => {
  const { currentTimeframe, lastUpdateTime, setLastUpdateTime, currentRefreshInterval } =
    React.useContext(MetricsCommonContext);

  const { data, refresh } = useModelServingMetrics(
    type,
    queries,
    currentTimeframe,
    lastUpdateTime,
    setLastUpdateTime,
    currentRefreshInterval,
    namespace,
  );

  const contextValue = React.useMemo(
    () => ({ data, refresh, namespace }),
    [data, refresh, namespace],
  );

  return (
    <ModelServingMetricsContext.Provider value={contextValue}>
      {children}
    </ModelServingMetricsContext.Provider>
  );
};

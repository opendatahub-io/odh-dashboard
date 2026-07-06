import * as React from 'react';
import { useModelServingMetrics } from '#~/api';
import { PrometheusQueryRangeResponseDataResult, PrometheusQueryRangeResultValue } from '#~/types';
import { FetchStateObject } from '#~/utilities/useFetch';
import { DEFAULT_LIST_FETCH_STATE } from '#~/utilities/const';
import { PerformanceMetricType } from '#~/pages/modelServing/screens/types';
import { MetricsCommonContext } from '#~/concepts/metrics/MetricsCommonContext';

export enum ModelMetricType {
  REQUEST_COUNT_SUCCESS = 'inference_request-count-successes',
  REQUEST_COUNT_FAILED = 'inference_request-count-fails',
  TRUSTY_AI_SPD = 'trustyai_spd',
  TRUSTY_AI_DIR = 'trustyai_dir',
}

type ModelServingMetricsContextType = {
  data: {
    [ModelMetricType.REQUEST_COUNT_FAILED]: FetchStateObject<PrometheusQueryRangeResultValue[]>;
    [ModelMetricType.REQUEST_COUNT_SUCCESS]: FetchStateObject<PrometheusQueryRangeResultValue[]>;
    [ModelMetricType.TRUSTY_AI_SPD]: FetchStateObject<PrometheusQueryRangeResponseDataResult[]>;
    [ModelMetricType.TRUSTY_AI_DIR]: FetchStateObject<PrometheusQueryRangeResponseDataResult[]>;
  };
  refresh: () => void;
  namespace: string;
};

export const ModelServingMetricsContext = React.createContext<ModelServingMetricsContextType>({
  data: {
    [ModelMetricType.REQUEST_COUNT_FAILED]: DEFAULT_LIST_FETCH_STATE,
    [ModelMetricType.REQUEST_COUNT_SUCCESS]: DEFAULT_LIST_FETCH_STATE,
    [ModelMetricType.TRUSTY_AI_SPD]: DEFAULT_LIST_FETCH_STATE,
    [ModelMetricType.TRUSTY_AI_DIR]: DEFAULT_LIST_FETCH_STATE,
  },
  refresh: () => undefined,
  namespace: '',
});

type ModelServingMetricsProviderProps = {
  children: React.ReactNode;
  /** Prometheus query strings computed and ready to use */
  queries: { [key in ModelMetricType]: string };
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

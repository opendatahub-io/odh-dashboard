import React from 'react';
import { KserveMetricGraphDefinition } from '~/concepts/metrics/kserve/types';
import { defaultResponsePredicate } from '~/api/prometheus/usePrometheusQueryRange';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { TimeframeTitle } from '~/concepts/metrics/types';
import useQueryRangeResourceData from '~/api/prometheus/useQueryRangeResourceData';
import { PendingContextResourceData, PrometheusQueryRangeResultValue } from '~/types';
import { DEFAULT_PENDING_CONTEXT_RESOURCE } from '~/api/prometheus/const';

type RequestCountData = {
  data: {
    successCount: PendingContextResourceData<PrometheusQueryRangeResultValue>;
    failedCount: PendingContextResourceData<PrometheusQueryRangeResultValue>;
  };
  refreshAll: () => void;
};

export const useFetchKserveRequestCountData = (
  metricsDef: KserveMetricGraphDefinition,
  timeframe: TimeframeTitle,
  endInMs: number,
  namespace: string,
): RequestCountData => {
  const active = useIsAreaAvailable(SupportedArea.K_SERVE_METRICS).status;

  const successQuery = metricsDef.queries[0]?.query;
  const failedQuery = metricsDef.queries[1]?.query;

  const successCount = useQueryRangeResourceData(
    active,
    successQuery,
    endInMs,
    timeframe,
    defaultResponsePredicate,
    namespace,
  );

  const failedCount = useQueryRangeResourceData(
    active,
    failedQuery,
    endInMs,
    timeframe,
    defaultResponsePredicate,
    namespace,
  );

  const data = React.useMemo(
    () => ({
      successCount,
      failedCount,
    }),
    [failedCount, successCount],
  );

  return useAllSettledContextResourceData(data, {
    successCount: DEFAULT_PENDING_CONTEXT_RESOURCE,
    failedCount: DEFAULT_PENDING_CONTEXT_RESOURCE,
  });
};

type MeanLatencyData = {
  data: {
    inferenceLatency: PendingContextResourceData<PrometheusQueryRangeResultValue>;
    requestLatency: PendingContextResourceData<PrometheusQueryRangeResultValue>;
  };
  refreshAll: () => void;
};

export const useFetchKserveMeanLatencyData = (
  metricsDef: KserveMetricGraphDefinition,
  timeframe: TimeframeTitle,
  endInMs: number,
  namespace: string,
): MeanLatencyData => {
  const active = useIsAreaAvailable(SupportedArea.K_SERVE_METRICS).status;

  const inferenceLatency = useQueryRangeResourceData(
    active,
    metricsDef.queries[0]?.query,
    endInMs,
    timeframe,
    defaultResponsePredicate,
    namespace,
  );

  const requestLatency = useQueryRangeResourceData(
    active,
    metricsDef.queries[1]?.query,
    endInMs,
    timeframe,
    defaultResponsePredicate,
    namespace,
  );

  const data = React.useMemo(
    () => ({
      inferenceLatency,
      requestLatency,
    }),
    [inferenceLatency, requestLatency],
  );

  return useAllSettledContextResourceData(data, {
    inferenceLatency: DEFAULT_PENDING_CONTEXT_RESOURCE,
    requestLatency: DEFAULT_PENDING_CONTEXT_RESOURCE,
  });
};

type CpuUsageData = {
  data: {
    cpuUsage: PendingContextResourceData<PrometheusQueryRangeResultValue>;
  };
  refreshAll: () => void;
};

export const useFetchKserveCpuUsageData = (
  metricsDef: KserveMetricGraphDefinition,
  timeframe: TimeframeTitle,
  endInMs: number,
  namespace: string,
): CpuUsageData => {
  const active = useIsAreaAvailable(SupportedArea.K_SERVE_METRICS).status;

  const cpuUsage = useQueryRangeResourceData(
    active,
    metricsDef.queries[0]?.query,
    endInMs,
    timeframe,
    defaultResponsePredicate,
    namespace,
  );

  const data = React.useMemo(
    () => ({
      cpuUsage,
    }),
    [cpuUsage],
  );

  return useAllSettledContextResourceData(data, {
    cpuUsage: DEFAULT_PENDING_CONTEXT_RESOURCE,
  });
};

type MemoryUsageData = {
  data: {
    memoryUsage: PendingContextResourceData<PrometheusQueryRangeResultValue>;
  };
  refreshAll: () => void;
};

export const useFetchKserveMemoryUsageData = (
  metricsDef: KserveMetricGraphDefinition,
  timeframe: TimeframeTitle,
  endInMs: number,
  namespace: string,
): MemoryUsageData => {
  const active = useIsAreaAvailable(SupportedArea.K_SERVE_METRICS).status;

  const memoryUsage = useQueryRangeResourceData(
    active,
    metricsDef.queries[0]?.query,
    endInMs,
    timeframe,
    defaultResponsePredicate,
    namespace,
  );

  const data = React.useMemo(
    () => ({
      memoryUsage,
    }),
    [memoryUsage],
  );

  return useAllSettledContextResourceData(data, {
    memoryUsage: DEFAULT_PENDING_CONTEXT_RESOURCE,
  });
};

type TimeToFirstTokenData = {
  data: {
    timeToFirstToken: PendingContextResourceData<PrometheusQueryRangeResultValue>;
  };
  refreshAll: () => void;
};


export const useFetchKserveTimeToFirstTokenData = (
  metricsDef: KserveMetricGraphDefinition,
  timeframe: TimeframeTitle,
  endInMs: number,
  namespace: string,
): TimeToFirstTokenData => {
  const active = useIsAreaAvailable(SupportedArea.K_SERVE_METRICS).status;

  const timeToFirstToken = useQueryRangeResourceData(
    active,
    metricsDef.queries[0]?.query,
    endInMs,
    timeframe,
    defaultResponsePredicate,
    namespace,
  );

  const data = React.useMemo(
    () => ({
      timeToFirstToken,
    }),
    [timeToFirstToken],
  );

  return useAllSettledContextResourceData(data, {
    timeToFirstToken: DEFAULT_PENDING_CONTEXT_RESOURCE,
  });
};

// Graph #5
type TimePerOutputTokenData = {
  data: {
    timePerOutputToken: PendingContextResourceData<PrometheusQueryRangeResultValue>;
  };
  refreshAll: () => void;
};
export const useFetchKserveTimePerOutputTokenData = (
  metricsDef: KserveMetricGraphDefinition,
  timeframe: TimeframeTitle,
  endInMs: number,
  namespace: string,
): TimePerOutputTokenData => {
  // Check if KServe metrics are active
  const active = useIsAreaAvailable(SupportedArea.K_SERVE_METRICS).status;
  // Extract the query for TIME_PER_OUTPUT_TOKEN
  const timePerOutputTokenQuery = metricsDef.queries[0].query; // Assumes it's the first query in the metric definition
  // Fetch data using useQueryRangeResourceData
  const timePerOutputToken = useQueryRangeResourceData(
    active,
    timePerOutputTokenQuery,
    endInMs,
    timeframe,
    defaultResponsePredicate,
    namespace,
  );
  // Memoize the fetched data
  const data = React.useMemo(
    () => ({
      timePerOutputToken,
    }),
    [timePerOutputToken],
  );
  // Return all-settled context resource data
  return useAllSettledContextResourceData(data, {
    timePerOutputToken: DEFAULT_PENDING_CONTEXT_RESOURCE,
  });
};


const useAllSettledContextResourceData = <
  T,
  U extends Record<string, PendingContextResourceData<T>>,
>(
  data: U,
  defaultValue: U,
) => {
  const refreshAll = React.useCallback(() => {
    Object.values(data).forEach((x) => x.refresh());
  }, [data]);

  const result = React.useMemo(
    () => ({
      data,
      refreshAll,
    }),
    [data, refreshAll],
  );

  // store the result in a reference and only update the reference so long as there are no pending queries
  const resultRef = React.useRef({ data: defaultValue, refreshAll });

  // only update the ref when all values are settled, i.e. not pending.
  if (!Object.values(result.data).some((x) => x.pending)) {
    resultRef.current = result;
  }

  return resultRef.current;
};

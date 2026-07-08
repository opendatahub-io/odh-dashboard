import * as React from 'react';
import usePrometheusQuery from '@odh-dashboard/internal/api/prometheus/usePrometheusQuery';
import { PrometheusQueryResponse } from '@odh-dashboard/internal/types';
import {
  INFRASTRUCTURE_REFRESH_INTERVAL,
  PROMQL_ACCELERATOR_ALLOCATABLE,
  PROMQL_ACCELERATOR_IN_USE,
  PROMQL_COMPUTE_UTILIZATION,
  PROMQL_MEMORY_UTILIZATION,
} from '../const';

const PROMETHEUS_API = '/api/prometheus/query';

type AcceleratorMetrics = {
  total: number;
  inUse: number;
};

type UtilizationMetrics = {
  percentage: number;
};

export type ClusterMetrics = {
  accelerators: AcceleratorMetrics | null;
  computeUtilization: UtilizationMetrics | null;
  memoryUtilization: UtilizationMetrics | null;
  loaded: boolean;
  error?: Error;
  lastRefreshed: Date | null;
  refresh: () => void;
};

const parseScalarResult = (response: PrometheusQueryResponse | null): number | null => {
  if (response?.data.result[0]?.value?.[1] == null) {
    return null;
  }
  const val = parseFloat(response.data.result[0].value[1]);
  return Number.isNaN(val) ? null : val;
};

const useInfrastructureMetrics = (): ClusterMetrics => {
  const [lastRefreshed, setLastRefreshed] = React.useState<Date | null>(null);
  const fetchOptions = React.useMemo(() => ({ refreshRate: INFRASTRUCTURE_REFRESH_INTERVAL }), []);

  const allocatable = usePrometheusQuery(
    PROMETHEUS_API,
    PROMQL_ACCELERATOR_ALLOCATABLE,
    fetchOptions,
  );
  const inUse = usePrometheusQuery(PROMETHEUS_API, PROMQL_ACCELERATOR_IN_USE, fetchOptions);
  const compute = usePrometheusQuery(PROMETHEUS_API, PROMQL_COMPUTE_UTILIZATION, fetchOptions);
  const memory = usePrometheusQuery(PROMETHEUS_API, PROMQL_MEMORY_UTILIZATION, fetchOptions);

  const loaded =
    (allocatable.loaded || !!allocatable.error) &&
    (inUse.loaded || !!inUse.error) &&
    (compute.loaded || !!compute.error) &&
    (memory.loaded || !!memory.error);
  const error = allocatable.error || inUse.error || compute.error || memory.error;

  React.useEffect(() => {
    if (loaded) {
      setLastRefreshed(new Date());
    }
  }, [loaded, allocatable.data, inUse.data, compute.data, memory.data]);

  const accelerators = React.useMemo((): AcceleratorMetrics | null => {
    const total = parseScalarResult(allocatable.data);
    const used = parseScalarResult(inUse.data);
    if (total === null) {
      return null;
    }
    return { total, inUse: Math.min(used ?? 0, total) };
  }, [allocatable.data, inUse.data]);

  const computeUtilization = React.useMemo((): UtilizationMetrics | null => {
    const pct = parseScalarResult(compute.data);
    if (pct === null) {
      return null;
    }
    return { percentage: Math.round(pct) };
  }, [compute.data]);

  const memoryUtilization = React.useMemo((): UtilizationMetrics | null => {
    const pct = parseScalarResult(memory.data);
    if (pct === null) {
      return null;
    }
    return { percentage: Math.round(pct) };
  }, [memory.data]);

  const refresh = React.useCallback(() => {
    allocatable.refresh();
    inUse.refresh();
    compute.refresh();
    memory.refresh();
    setLastRefreshed(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- .refresh references are stable from useFetch
  }, [allocatable.refresh, inUse.refresh, compute.refresh, memory.refresh]);

  return {
    accelerators,
    computeUtilization,
    memoryUtilization,
    loaded,
    error,
    lastRefreshed,
    refresh,
  };
};

export default useInfrastructureMetrics;

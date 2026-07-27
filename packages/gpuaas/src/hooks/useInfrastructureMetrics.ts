import * as React from 'react';
import usePrometheusQuery from '@odh-dashboard/internal/api/prometheus/usePrometheusQuery';
import { PrometheusQueryResponse } from '@odh-dashboard/internal/types';
import {
  INFRASTRUCTURE_REFRESH_INTERVAL,
  PROMQL_ACCELERATOR_ALLOCATABLE,
  PROMQL_ACCELERATOR_IN_USE,
  PROMQL_COMPUTE_UTILIZATION,
  PROMQL_HARDWARE_IN_USE,
  PROMQL_HARDWARE_NODE_LABELS,
  PROMQL_HARDWARE_TOTAL,
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

export type HardwareModelUsage = {
  modelName: string;
  inUse: number;
  available: number;
};

export type ClusterMetrics = {
  accelerators: AcceleratorMetrics | null;
  computeUtilization: UtilizationMetrics | null;
  memoryUtilization: UtilizationMetrics | null;
  hardwareUsage: HardwareModelUsage[] | null;
  clusterLoaded: boolean;
  hardwareLoaded: boolean;
  loaded: boolean;
  error?: Error;
  lastRefreshed: Date | null;
  refresh: () => void;
};

type HardwareModelResponse = PrometheusQueryResponse<{ metric: { modelName: string } }>;
type NodeLabelMetric = {
  label_nvidia_com_gpu_product?: string;
  label_amd_com_gpu_product?: string;
  label_habana_ai_gaudi?: string;
  label_intel_com_gpu_product?: string;
};
type NodeLabelResponse = PrometheusQueryResponse<{ metric: NodeLabelMetric }>;

const parseScalarResult = (response: PrometheusQueryResponse | null): number | null => {
  if (response?.data.result[0]?.value?.[1] == null) {
    return null;
  }
  const val = parseFloat(response.data.result[0].value[1]);
  return Number.isNaN(val) ? null : val;
};

const parseHardwareDcgm = (
  totalResponse: HardwareModelResponse | null,
  inUseResponse: HardwareModelResponse | null,
): HardwareModelUsage[] => {
  if (!totalResponse?.data.result.length) {
    return [];
  }

  const inUseMap = new Map<string, number>();
  inUseResponse?.data.result.forEach(({ metric, value }) => {
    inUseMap.set(metric.modelName, Number(value[1]) || 0);
  });

  return totalResponse.data.result
    .map(({ metric, value }) => {
      const total = Number(value[1]) || 0;
      const inUse = inUseMap.get(metric.modelName) ?? 0;
      return {
        modelName: metric.modelName,
        inUse: Math.min(inUse, total),
        available: Math.max(0, total - inUse),
      };
    })
    .toSorted((a, b) => b.inUse + b.available - (a.inUse + a.available));
};

const parseHardwareNodeLabels = (response: NodeLabelResponse | null): HardwareModelUsage[] => {
  if (!response?.data.result.length) {
    return [];
  }

  return response.data.result
    .map(({ metric, value }) => {
      const name =
        metric.label_nvidia_com_gpu_product ||
        metric.label_amd_com_gpu_product ||
        metric.label_habana_ai_gaudi ||
        metric.label_intel_com_gpu_product ||
        'Unknown';
      return { modelName: name, inUse: 0, available: Number(value[1]) || 0 };
    })
    .filter(({ modelName }) => modelName !== 'Unknown')
    .toSorted((a, b) => b.available - a.available);
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

  const hwTotal = usePrometheusQuery<HardwareModelResponse>(
    PROMETHEUS_API,
    PROMQL_HARDWARE_TOTAL,
    fetchOptions,
  );
  const hwInUse = usePrometheusQuery<HardwareModelResponse>(
    PROMETHEUS_API,
    PROMQL_HARDWARE_IN_USE,
    fetchOptions,
  );
  const hwNodeLabels = usePrometheusQuery<NodeLabelResponse>(
    PROMETHEUS_API,
    PROMQL_HARDWARE_NODE_LABELS,
    fetchOptions,
  );

  const clusterLoaded =
    (allocatable.loaded || !!allocatable.error) &&
    (inUse.loaded || !!inUse.error) &&
    (compute.loaded || !!compute.error) &&
    (memory.loaded || !!memory.error);
  const hardwareLoaded =
    (hwTotal.loaded || !!hwTotal.error) &&
    (hwInUse.loaded || !!hwInUse.error) &&
    (hwNodeLabels.loaded || !!hwNodeLabels.error);
  const loaded = clusterLoaded && hardwareLoaded;
  const error = allocatable.error || inUse.error || compute.error || memory.error || hwTotal.error;

  React.useEffect(() => {
    if (loaded) {
      setLastRefreshed(new Date());
    }
  }, [
    loaded,
    allocatable.data,
    inUse.data,
    compute.data,
    memory.data,
    hwTotal.data,
    hwInUse.data,
    hwNodeLabels.data,
  ]);

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

  const hardwareUsage = React.useMemo((): HardwareModelUsage[] | null => {
    const dcgm = parseHardwareDcgm(hwTotal.data, hwInUse.data);
    if (dcgm.length > 0) {
      return dcgm;
    }
    const nodeLabels = parseHardwareNodeLabels(hwNodeLabels.data);
    return nodeLabels.length > 0 ? nodeLabels : null;
  }, [hwTotal.data, hwInUse.data, hwNodeLabels.data]);

  const refresh = React.useCallback(() => {
    allocatable.refresh();
    inUse.refresh();
    compute.refresh();
    memory.refresh();
    hwTotal.refresh();
    hwInUse.refresh();
    hwNodeLabels.refresh();
    setLastRefreshed(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- .refresh references are stable from useFetch
  }, [
    allocatable.refresh,
    inUse.refresh,
    compute.refresh,
    memory.refresh,
    hwTotal.refresh,
    hwInUse.refresh,
    hwNodeLabels.refresh,
  ]);

  return {
    accelerators,
    computeUtilization,
    memoryUtilization,
    hardwareUsage,
    clusterLoaded,
    hardwareLoaded,
    loaded,
    error,
    lastRefreshed,
    refresh,
  };
};

export default useInfrastructureMetrics;

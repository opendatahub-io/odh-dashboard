import * as React from 'react';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import { PrometheusQueryResponse } from '#~/types';
import { POLL_INTERVAL } from '#~/utilities/const';
import usePrometheusQuery from './usePrometheusQuery';

/** Both fields may be NaN at runtime when Prometheus data is unavailable */
export type PVCUsageInfo = {
  usedInBytes: number;
  capacityInBytes: number;
};

type PVCMetricResult = PrometheusQueryResponse<{ metric: { __name__: string } }>;

const PROM_FETCH_OPTIONS = { refreshRate: POLL_INTERVAL };

const findMetricValue = (result: PVCMetricResult | null, metricName: string): number => {
  const samples = result?.data.result ?? [];
  const rawValue = samples.find((r) => r.metric.__name__ === metricName)?.value[1];
  if (rawValue === undefined) {
    return NaN;
  }
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : NaN;
};

export const usePVCFreeAmount = (
  pvc: PersistentVolumeClaimKind,
): [info: PVCUsageInfo, loaded: boolean, error: Error | undefined] => {
  const pvcName = pvc.metadata.name;
  const { namespace } = pvc.metadata;

  const query =
    pvcName && namespace
      ? `namespace=${namespace}&query={__name__=~"kubelet_volume_stats_used_bytes|kubelet_volume_stats_capacity_bytes",persistentvolumeclaim='${pvcName}'}`
      : undefined;

  const {
    data: result,
    loaded,
    error,
  } = usePrometheusQuery<PVCMetricResult>('/api/prometheus/pvc', query, PROM_FETCH_OPTIONS);

  const usedInBytes = findMetricValue(result, 'kubelet_volume_stats_used_bytes');
  const capacityInBytes = findMetricValue(result, 'kubelet_volume_stats_capacity_bytes');
  const info: PVCUsageInfo = React.useMemo(
    () => ({ usedInBytes, capacityInBytes }),
    [usedInBytes, capacityInBytes],
  );

  return [info, loaded, error];
};

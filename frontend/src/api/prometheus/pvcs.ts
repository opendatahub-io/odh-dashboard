import * as React from 'react';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import { PrometheusQueryResponse } from '#~/types';
import { POLL_INTERVAL } from '#~/utilities/const';
import usePrometheusQuery from './usePrometheusQuery';

export type PVCUsageInfo = {
  usedInBytes: number | typeof NaN;
  capacityInBytes: number | typeof NaN;
};

type PVCMetricResult = PrometheusQueryResponse<{ metric: { __name__: string } }>;

const PROM_FETCH_OPTIONS = { refreshRate: POLL_INTERVAL };

const findMetricValue = (result: PVCMetricResult | null, metricName: string): string | undefined =>
  result?.data.result.find((r) => r.metric.__name__ === metricName)?.value[1];

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

  const info: PVCUsageInfo = React.useMemo(
    () => ({
      usedInBytes: parseInt(findMetricValue(result, 'kubelet_volume_stats_used_bytes') || '', 10),
      capacityInBytes: parseInt(
        findMetricValue(result, 'kubelet_volume_stats_capacity_bytes') || '',
        10,
      ),
    }),
    [result],
  );

  return [info, loaded, error];
};

import * as React from 'react';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import { POLL_INTERVAL } from '#~/utilities/const';
import usePrometheusQuery from './usePrometheusQuery';

export const usePVCFreeAmount = (
  pvc: PersistentVolumeClaimKind,
): [bytesInUse: number | typeof NaN, loaded: boolean, error: Error | undefined] => {
  const [result, loaded, loadError, refetch] = usePrometheusQuery(
    '/api/prometheus/pvc',
    `namespace=${pvc.metadata.namespace}&query=kubelet_volume_stats_used_bytes{persistentvolumeclaim='${pvc.metadata.name}'}`,
  );

  // TODO mturley we can probably get rid of this and just pass a refreshRate in fetchOptions to usePrometheusQuery
  React.useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, POLL_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [refetch]);

  const value = result?.data.result[0]?.value[1];
  const usedInBytes = parseInt(value || '', 10);

  return [usedInBytes, loaded, loadError];
};

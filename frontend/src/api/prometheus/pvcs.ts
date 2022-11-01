import * as React from 'react';
import usePrometheusQuery from './usePrometheusQuery';
import { PersistentVolumeClaimKind } from '../../k8sTypes';
import { POLL_INTERVAL } from '../../utilities/const';

export const usePVCFreeAmount = (
  pvc: PersistentVolumeClaimKind,
): [bytesInUse: number | typeof NaN, loaded: boolean, error: Error | undefined] => {
  const [result, loaded, loadError, refetch] = usePrometheusQuery(
    pvc.metadata.namespace,
    `kubelet_volume_stats_used_bytes{persistentvolumeclaim='${pvc.metadata.name}'}`,
  );

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

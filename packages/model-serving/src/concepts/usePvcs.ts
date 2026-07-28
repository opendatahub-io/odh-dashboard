import * as React from 'react';
import type { PersistentVolumeClaimKind } from '@odh-dashboard/k8s-core';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import { useHostApi } from '@odh-dashboard/plugin-core/host-api';

export default function usePvcs(namespace?: string): FetchStateObject<PersistentVolumeClaimKind[]> {
  const { getDashboardPvcs } = useHostApi();

  const callback = React.useCallback<
    FetchStateCallbackPromise<PersistentVolumeClaimKind[]>
  >(async () => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }
    const pvcs = await getDashboardPvcs(namespace);
    return pvcs;
  }, [getDashboardPvcs, namespace]);
  return useFetch(callback, []);
}

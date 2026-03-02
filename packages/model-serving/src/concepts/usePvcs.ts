import * as React from 'react';
import { PersistentVolumeClaimKind } from '@odh-dashboard/internal/k8sTypes';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
  NotReadyError,
} from '@odh-dashboard/internal/utilities/useFetch';
import { getDashboardPvcs } from '@odh-dashboard/internal/api/k8s/pvcs';

export default function usePvcs(namespace?: string): FetchStateObject<PersistentVolumeClaimKind[]> {
  const callback = React.useCallback<
    FetchStateCallbackPromise<PersistentVolumeClaimKind[]>
  >(async () => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }
    const pvcs = await getDashboardPvcs(namespace);
    return pvcs;
  }, [namespace]);
  return useFetch(callback, []);
}

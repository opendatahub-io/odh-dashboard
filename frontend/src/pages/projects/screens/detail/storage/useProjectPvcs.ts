import * as React from 'react';
import type { PersistentVolumeClaimKind } from '@odh-dashboard/k8s-core';
import { getDashboardPvcs } from '#~/api';
import useFetch, { FetchOptions, FetchStateObject, NotReadyError } from '#~/utilities/useFetch';

const useProjectPvcs = (
  namespace?: string,
  fetchOptions?: Partial<FetchOptions>,
): FetchStateObject<PersistentVolumeClaimKind[]> => {
  const getProjectPvcs = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }

    return getDashboardPvcs(namespace);
  }, [namespace]);

  return useFetch<PersistentVolumeClaimKind[]>(getProjectPvcs, [], fetchOptions);
};

export default useProjectPvcs;

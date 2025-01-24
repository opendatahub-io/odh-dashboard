import * as React from 'react';
import { getDashboardPvcs } from '~/api';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import useFetchState, { FetchOptions, FetchState, NotReadyError } from '~/utilities/useFetchState';

const useProjectPvcs = (
  namespace?: string,
  fetchOptions?: Partial<FetchOptions>,
): FetchState<PersistentVolumeClaimKind[]> => {
  const getProjectPvcs = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }

    return getDashboardPvcs(namespace);
  }, [namespace]);

  return useFetchState<PersistentVolumeClaimKind[]>(getProjectPvcs, [], fetchOptions);
};

export default useProjectPvcs;

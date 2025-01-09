import * as React from 'react';
import { getAllDashboardPvcs, getDashboardPvcs } from '~/api';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';

const useProjectPvcs = (
  namespace?: string,
  allowAll?: boolean,
): FetchState<PersistentVolumeClaimKind[]> => {
  const getProjectPvcs = React.useCallback(() => {
    if (!namespace) {
      if (allowAll) {
        return getAllDashboardPvcs();
      }
      return Promise.reject(new NotReadyError('No namespace'));
    }

    return getDashboardPvcs(namespace);
  }, [allowAll, namespace]);

  return useFetchState<PersistentVolumeClaimKind[]>(getProjectPvcs, []);
};

export default useProjectPvcs;

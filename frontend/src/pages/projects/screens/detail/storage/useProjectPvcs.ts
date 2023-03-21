import * as React from 'react';
import { getPvcs } from '~/api';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';

const useProjectPvcs = (namespace?: string): FetchState<PersistentVolumeClaimKind[]> => {
  const getProjectPvcs = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }

    return getPvcs(namespace);
  }, [namespace]);

  return useFetchState<PersistentVolumeClaimKind[]>(getProjectPvcs, []);
};

export default useProjectPvcs;

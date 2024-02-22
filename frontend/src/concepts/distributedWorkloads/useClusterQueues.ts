import * as React from 'react';
import { ClusterQueueKind } from '~/k8sTypes';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';
import { listClusterQueues } from '~/api';

const useClusterQueues = (refreshRate = 0): FetchState<ClusterQueueKind[]> => {
  const dwEnabled = useIsAreaAvailable(SupportedArea.DISTRIBUTED_WORKLOADS).status;
  return useFetchState<ClusterQueueKind[]>(
    React.useCallback(() => {
      if (!dwEnabled) {
        return Promise.reject(new NotReadyError('Distributed workloads is not enabled'));
      }
      return listClusterQueues();
    }, [dwEnabled]),
    [],
    { refreshRate },
  );
};

export default useClusterQueues;

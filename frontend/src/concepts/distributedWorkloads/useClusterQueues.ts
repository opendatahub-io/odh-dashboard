import * as React from 'react';
import { ClusterQueueKind } from '#~/k8sTypes';
import useDistributedWorkloadsEnabled from '#~/concepts/distributedWorkloads/useDistributedWorkloadsEnabled';
import useFetchState, { FetchState, NotReadyError } from '#~/utilities/useFetchState';
import { listClusterQueues } from '#~/api';

const useClusterQueues = (refreshRate = 0): FetchState<ClusterQueueKind[]> => {
  const dwEnabled = useDistributedWorkloadsEnabled();
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

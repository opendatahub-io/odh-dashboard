import * as React from 'react';
import { LocalQueueKind } from '#~/k8sTypes';
import useDistributedWorkloadsEnabled from '#~/concepts/distributedWorkloads/useDistributedWorkloadsEnabled';
import useFetchState, { FetchState, NotReadyError } from '#~/utilities/useFetchState';
import { listLocalQueues } from '#~/api';

const useLocalQueues = (namespace?: string, refreshRate = 0): FetchState<LocalQueueKind[]> => {
  const dwEnabled = useDistributedWorkloadsEnabled();
  return useFetchState<LocalQueueKind[]>(
    React.useCallback(() => {
      if (!dwEnabled) {
        return Promise.reject(new NotReadyError('Distributed workloads is not enabled'));
      }
      if (!namespace) {
        return Promise.reject(new NotReadyError('No namespace'));
      }
      return listLocalQueues(namespace);
    }, [dwEnabled, namespace]),
    [],
    { refreshRate, initialPromisePurity: true },
  );
};

export default useLocalQueues;

import * as React from 'react';
import { WorkloadKind } from '#~/k8sTypes';
import useDistributedWorkloadsEnabled from '#~/concepts/distributedWorkloads/useDistributedWorkloadsEnabled';
import useFetchState, { FetchState, NotReadyError } from '#~/utilities/useFetchState';
import { listWorkloads } from '#~/api';

const useWorkloads = (namespace?: string, refreshRate = 0): FetchState<WorkloadKind[]> => {
  const dwEnabled = useDistributedWorkloadsEnabled();
  return useFetchState<WorkloadKind[]>(
    React.useCallback(() => {
      if (!dwEnabled) {
        return Promise.reject(new NotReadyError('Distributed workloads is not enabled'));
      }
      if (!namespace) {
        return Promise.reject(new NotReadyError('No namespace'));
      }
      return listWorkloads(namespace);
    }, [dwEnabled, namespace]),
    [],
    { refreshRate, initialPromisePurity: true },
  );
};

export default useWorkloads;

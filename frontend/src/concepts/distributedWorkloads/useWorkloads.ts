import * as React from 'react';
import useFetchState, {
  FetchState,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetchState';
import { WorkloadKind } from '#~/k8sTypes';
import useDistributedWorkloadsEnabled from '#~/concepts/distributedWorkloads/useDistributedWorkloadsEnabled';
import { listWorkloads } from '#~/api';

const useWorkloads = (namespace?: string, refreshRate = 0): FetchState<WorkloadKind[]> => {
  const dwEnabled = useDistributedWorkloadsEnabled();
  return useFetchState<WorkloadKind[]>(
    React.useCallback(() => {
      if (!dwEnabled) {
        return Promise.reject(new NotReadyError('Workload metrics is not enabled'));
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

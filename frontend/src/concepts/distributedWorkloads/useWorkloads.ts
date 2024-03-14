import * as React from 'react';
import { WorkloadKind } from '~/k8sTypes';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';
import { listWorkloads } from '~/api';

const useWorkloads = (namespace?: string, refreshRate = 0): FetchState<WorkloadKind[]> => {
  const dwEnabled = useIsAreaAvailable(SupportedArea.DISTRIBUTED_WORKLOADS).status;
  return useFetchState<WorkloadKind[]>(
    React.useCallback(() => {
      if (!dwEnabled) {
        return Promise.reject(new NotReadyError('Distributed workloads is not enabled'));
      }
      return listWorkloads(namespace);
    }, [dwEnabled, namespace]),
    [],
    { refreshRate, initialPromisePurity: true },
  );
};

export default useWorkloads;

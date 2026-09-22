import * as React from 'react';
import type { LocalQueueKind } from '@odh-dashboard/k8s-core';
import useFetch, { NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetch';
import { getClusterQueueNameFromLocalQueues } from '@odh-dashboard/hardware-profiles/pages/utils';
import { listLocalQueues } from '@odh-dashboard/k8s-core/api/localQueues';

type UseClusterQueueFromLocalQueueResult = {
  clusterQueueName: string | undefined;
  loaded: boolean;
  error: Error | undefined;
};

const useClusterQueueFromLocalQueue = (
  localQueueName: string | undefined,
  namespace: string | undefined,
): UseClusterQueueFromLocalQueueResult => {
  const {
    data: localQueues,
    loaded,
    error,
  } = useFetch<LocalQueueKind[]>(
    React.useCallback(() => {
      if (!namespace || !localQueueName) {
        return Promise.reject(new NotReadyError('Missing namespace or local queue name'));
      }
      return listLocalQueues(namespace);
    }, [namespace, localQueueName]),
    [],
    { initialPromisePurity: true },
  );

  const clusterQueueName = React.useMemo(
    () => getClusterQueueNameFromLocalQueues(localQueueName, { data: localQueues, loaded }),
    [localQueueName, localQueues, loaded],
  );

  return { clusterQueueName, loaded, error };
};

export default useClusterQueueFromLocalQueue;

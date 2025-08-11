import * as React from 'react';
import { LocalQueueKind } from '@odh-dashboard/internal/k8sTypes';
import { listLocalQueues } from '@odh-dashboard/internal/api/k8s/localQueues';
import { NotReadyError } from '@odh-dashboard/internal/utilities/useFetchState';
import useFetch from '@odh-dashboard/internal/utilities/useFetch.js';

type UseClusterQueueFromLocalQueueResult = {
  clusterQueueName: string | null;
  loaded: boolean;
  error: Error | undefined;
};

/**
 * Hook to get the cluster queue name from a local queue name
 * @param localQueueName - The name of the local queue
 * @param namespace - The namespace where the local queue is located
 * @returns Object containing cluster queue name, loading state, and error
 */
const useClusterQueueFromLocalQueue = (
  localQueueName?: string,
  namespace?: string,
): UseClusterQueueFromLocalQueueResult => {
  const {
    data: localQueues,
    loaded: localQueuesLoaded,
    error: localQueuesError,
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

  const clusterQueueName = React.useMemo(() => {
    if (!localQueuesLoaded || !localQueueName) {
      return null;
    }

    const matchingLocalQueue = localQueues.find((lq) => lq.metadata?.name === localQueueName);

    return matchingLocalQueue?.spec.clusterQueue || null;
  }, [localQueues, localQueuesLoaded, localQueueName]);

  return {
    clusterQueueName,
    loaded: localQueuesLoaded,
    error: localQueuesError,
  };
};

export default useClusterQueueFromLocalQueue;

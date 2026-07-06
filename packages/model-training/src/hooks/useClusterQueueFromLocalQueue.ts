import * as React from 'react';
import { LocalQueueKind } from '@odh-dashboard/internal/k8sTypes';
import { NotReadyError } from '@odh-dashboard/internal/utilities/useFetchState';
import useFetch from '@odh-dashboard/internal/utilities/useFetch';
import { getLocalQueue } from '../api/queue';

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
    data: localQueue,
    loaded: localQueueLoaded,
    error: localQueueError,
  } = useFetch<LocalQueueKind | null>(
    React.useCallback(() => {
      if (!namespace || !localQueueName) {
        return Promise.reject(new NotReadyError('Missing namespace or local queue name'));
      }
      return getLocalQueue(localQueueName, namespace);
    }, [namespace, localQueueName]),
    null,
    { initialPromisePurity: true },
  );

  const clusterQueueName = React.useMemo(() => {
    if (!localQueueLoaded || !localQueue) {
      return null;
    }

    return localQueue.spec.clusterQueue;
  }, [localQueue, localQueueLoaded]);

  return {
    clusterQueueName,
    loaded: localQueueLoaded,
    error: localQueueError,
  };
};

export default useClusterQueueFromLocalQueue;

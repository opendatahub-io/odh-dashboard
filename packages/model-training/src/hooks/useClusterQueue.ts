import * as React from 'react';
import { ClusterQueueKind } from '@odh-dashboard/internal/k8sTypes';
import { NotReadyError } from '@odh-dashboard/internal/utilities/useFetchState';
import useFetch from '@odh-dashboard/internal/utilities/useFetch';
import { getClusterQueue } from '../api/queue';

type UseClusterQueueResult = {
  clusterQueue: ClusterQueueKind | null;
  loaded: boolean;
  error: Error | undefined;
};

/**
 * Hook to get a specific cluster queue by name
 * @param clusterQueueName - The name of the cluster queue
 * @returns Object containing cluster queue data, loading state, and error
 */
const useClusterQueue = (clusterQueueName?: string | null): UseClusterQueueResult => {
  const {
    data: clusterQueue,
    loaded: clusterQueueLoaded,
    error: clusterQueueError,
  } = useFetch<ClusterQueueKind | null>(
    React.useCallback(() => {
      if (!clusterQueueName) {
        return Promise.reject(new NotReadyError('Missing cluster queue name'));
      }
      return getClusterQueue(clusterQueueName);
    }, [clusterQueueName]),
    null,
    { initialPromisePurity: true },
  );

  return {
    clusterQueue,
    loaded: clusterQueueLoaded,
    error: clusterQueueError,
  };
};

export default useClusterQueue;

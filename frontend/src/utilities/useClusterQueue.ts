import * as React from 'react';
import useFetch, { NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetch';
import { ClusterQueueKind } from '#~/k8sTypes';
import { getClusterQueue } from '#~/api';

type UseClusterQueueResult = {
  clusterQueue: ClusterQueueKind | null;
  loaded: boolean;
  error: Error | undefined;
};

/**
 * Fetches a ClusterQueue by name. Used for quotas and consumption in workbench
 * Resources tab and model serving.
 */
const useClusterQueue = (clusterQueueName: string | null | undefined): UseClusterQueueResult => {
  const { data, loaded, error } = useFetch<ClusterQueueKind | null>(
    React.useCallback(() => {
      if (!clusterQueueName) {
        return Promise.reject(new NotReadyError('Missing cluster queue name'));
      }
      return getClusterQueue(clusterQueueName);
    }, [clusterQueueName]),
    null,
    { initialPromisePurity: true },
  );

  return React.useMemo(
    () => ({
      clusterQueue: data ?? null,
      loaded,
      error,
    }),
    [data, loaded, error],
  );
};

export default useClusterQueue;

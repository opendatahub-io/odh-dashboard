import * as React from 'react';
import useWorkloadRows, { type UseWorkloadRowsOptions } from './useWorkloadRows';
import type { ClusterQueueWorkloadRow } from '../types';

export type UseClusterQueueWorkloadsResult = {
  workloads: ClusterQueueWorkloadRow[];
  loaded: boolean;
  error: Error | undefined;
  isEmpty: boolean;
  refresh: ReturnType<typeof useWorkloadRows>['refresh'];
};

/**
 * Workloads for one cluster queue (Quota usage detail panel).
 * Row mapping runs synchronously against the shared, pre-scoped namespace workload cache; queue
 * positions are enriched asynchronously (see useWorkloadRows).
 */
const useClusterQueueWorkloads = (
  clusterQueueName: string | undefined,
  options: UseWorkloadRowsOptions = {},
): UseClusterQueueWorkloadsResult => {
  const { data, loaded, error, refresh } = useWorkloadRows(
    {
      mode: 'clusterQueues',
      clusterQueueNames: clusterQueueName ? [clusterQueueName] : [],
    },
    options,
  );

  const workloads = React.useMemo(() => {
    if (!clusterQueueName || data.mode !== 'clusterQueues') {
      return [];
    }
    return data.workloadsByClusterQueue.get(clusterQueueName) ?? [];
  }, [clusterQueueName, data]);

  return {
    workloads,
    loaded,
    error,
    isEmpty: loaded && !error && workloads.length === 0,
    refresh,
  };
};

export default useClusterQueueWorkloads;

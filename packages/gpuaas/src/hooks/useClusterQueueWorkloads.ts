import * as React from 'react';
import useWorkloadRows, { type UseWorkloadRowsOptions } from './useWorkloadRows';
import type { ClusterQueueWorkloadRow, WorkloadRowsScope } from '../types';

export type UseClusterQueueWorkloadsResult = {
  workloads: ClusterQueueWorkloadRow[];
  loaded: boolean;
  error: Error | undefined;
  isEmpty: boolean;
  refresh: ReturnType<typeof useWorkloadRows>['refresh'];
};

/**
 * Fetches workloads for one cluster queue — for drawer/panel UX when user selects a CQ.
 * Pass undefined to skip fetch (drawer closed).
 */
const useClusterQueueWorkloads = (
  clusterQueueName: string | undefined,
  options: UseWorkloadRowsOptions = {},
): UseClusterQueueWorkloadsResult => {
  const scope = React.useMemo(
    (): WorkloadRowsScope => ({
      mode: 'clusterQueues',
      clusterQueueNames: clusterQueueName ? [clusterQueueName] : [],
    }),
    [clusterQueueName],
  );

  const { data, loaded, error, refresh } = useWorkloadRows(scope, options);

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

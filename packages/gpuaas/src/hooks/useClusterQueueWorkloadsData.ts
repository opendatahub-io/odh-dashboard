import useWorkloadRows, { type UseWorkloadRowsOptions } from './useWorkloadRows';
import type { ClusterQueueWorkloadRow } from '../types';

export type UseClusterQueueWorkloadsDataOptions = UseWorkloadRowsOptions;

export type UseClusterQueueWorkloadsDataResult = {
  workloadsByClusterQueue: Map<string, ClusterQueueWorkloadRow[]>;
  loaded: boolean;
  error: Error | undefined;
  refresh: ReturnType<typeof useWorkloadRows>['refresh'];
};

/** Batch fetch for multiple cluster queues. Drawer UX should use useClusterQueueWorkloads instead. */
const useClusterQueueWorkloadsData = (
  clusterQueueNames: string[],
  options: UseClusterQueueWorkloadsDataOptions = {},
): UseClusterQueueWorkloadsDataResult => {
  const { data, loaded, error, refresh } = useWorkloadRows(
    { mode: 'clusterQueues', clusterQueueNames },
    options,
  );

  const workloadsByClusterQueue =
    data.mode === 'clusterQueues' ? data.workloadsByClusterQueue : new Map();

  return {
    workloadsByClusterQueue,
    loaded,
    error,
    refresh,
  };
};

export default useClusterQueueWorkloadsData;

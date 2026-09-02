import useWorkloadRows, { type UseWorkloadRowsOptions } from './useWorkloadRows';
import type { ClusterQueueWorkloadRow } from '../types';

export type UseNamespaceWorkloadsOptions = UseWorkloadRowsOptions;

export type UseNamespaceWorkloadsResult = {
  workloads: ClusterQueueWorkloadRow[];
  loaded: boolean;
  error: Error | undefined;
  isEmpty: boolean;
  refresh: ReturnType<typeof useWorkloadRows>['refresh'];
};

/** Future namespace tab: all workloads in one namespace, any cluster queue. */
const useNamespaceWorkloads = (
  namespace: string | undefined,
  projectDisplayName: string | undefined,
  options: UseNamespaceWorkloadsOptions = {},
): UseNamespaceWorkloadsResult => {
  const scope =
    namespace && projectDisplayName
      ? { mode: 'namespace' as const, namespace, projectDisplayName }
      : { mode: 'namespace' as const, namespace: '', projectDisplayName: '' };

  const { data, loaded, error, refresh } = useWorkloadRows(scope, options);

  const workloads = data.mode === 'namespace' ? data.workloads : [];

  return {
    workloads: namespace ? workloads : [],
    loaded: namespace ? loaded : true,
    error,
    isEmpty: loaded && !error && workloads.length === 0,
    refresh,
  };
};

export default useNamespaceWorkloads;

import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { useProjects } from '@odh-dashboard/internal/api/k8s/projects';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import useFetch, {
  NotReadyError,
  type FetchStateObject,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import { useKueueNamespaceWorkloadCache } from './KueueNamespaceWorkloadCacheContext';
import type { WorkloadRowsFetchResult, WorkloadRowsScope, ClusterQueueWorkloadRow } from '../types';
import { INFRASTRUCTURE_MANUAL_REFRESH_ONLY } from '../const';
import {
  applyQueuePositionsToMap,
  fetchNamespaceWorkloads,
  fetchQueuePositions,
  getProjectDisplayName,
  mapWorkloadsForClusterQueuesSync,
  type QueuePositionKey,
} from '../utils/clusterQueueWorkloads';
import { getKueueManagedDataScienceProjects } from '../utils/kueueProjects';

export type UseWorkloadRowsOptions = {
  refreshRate?: number;
};

export type UseWorkloadRowsResult = {
  data: WorkloadRowsFetchResult;
  loaded: boolean;
  error: Error | undefined;
  refresh: FetchStateObject<WorkloadRowsFetchResult>['refresh'];
};

const emptyPositions = new Map<QueuePositionKey, number>();
const emptyWorkloadsByClusterQueue = new Map<string, ClusterQueueWorkloadRow[]>();

const buildProjectDisplayNames = (projects: ProjectKind[]): Map<string, string> =>
  new Map(
    projects.flatMap((project) => {
      const namespace = project.metadata.name;
      return namespace ? [[namespace, getProjectDisplayName(project)] as const] : [];
    }),
  );

const buildNamespaceScopeKey = (namespace: string, projectDisplayName: string): string =>
  `${namespace}\0${projectDisplayName}`;

const buildClusterQueueNamesKey = (clusterQueueNames: string[]): string =>
  clusterQueueNames.toSorted((a, b) => a.localeCompare(b)).join('\0');

const buildScopeKey = (scope: WorkloadRowsScope): string => {
  if (scope.mode === 'namespace') {
    return buildNamespaceScopeKey(scope.namespace, scope.projectDisplayName);
  }
  return buildClusterQueueNamesKey(scope.clusterQueueNames);
};

/**
 * Core workload rows hook. Scope selects admin cluster-queue view or single-namespace view.
 *
 * Cluster-queue mode: row mapping runs synchronously (`React.useMemo`) against the shared,
 * pre-scoped namespace workload cache — no second `useFetch` round-trip on a cache hit. Queue
 * positions (Visibility API) are fetched separately and patched in once available, so the table
 * renders before that latency resolves.
 */
const useWorkloadRows = (
  scope: WorkloadRowsScope,
  options: UseWorkloadRowsOptions = {},
): UseWorkloadRowsResult => {
  const { refreshRate = INFRASTRUCTURE_MANUAL_REFRESH_ONLY } = options;
  const [allProjects, , projectsError] = useProjects();
  const { dashboardNamespace } = useDashboardNamespace();
  const {
    cache,
    loaded: cacheLoaded,
    error: cacheError,
    refresh: refreshCache,
  } = useKueueNamespaceWorkloadCache();

  const kueueProjects = React.useMemo(
    () => getKueueManagedDataScienceProjects(allProjects),
    [allProjects],
  );

  const projectDisplayNames = React.useMemo(
    () => buildProjectDisplayNames(kueueProjects),
    [kueueProjects],
  );

  const scopeKey = React.useMemo(() => buildScopeKey(scope), [scope]);
  const isClusterQueuesScope = scope.mode === 'clusterQueues';
  const isSkippedClusterQueueScope = isClusterQueuesScope && scope.clusterQueueNames.length === 0;

  const scopeRef = React.useRef(scope);
  scopeRef.current = scope;

  // --- Cluster-queue scope: synchronous row mapping against the shared namespace cache. ---
  const baseWorkloadsByClusterQueue = React.useMemo(() => {
    const currentScope = scopeRef.current;
    if (currentScope.mode !== 'clusterQueues' || currentScope.clusterQueueNames.length === 0) {
      return emptyWorkloadsByClusterQueue;
    }
    if (!cacheLoaded) {
      return emptyWorkloadsByClusterQueue;
    }
    return mapWorkloadsForClusterQueuesSync(
      currentScope.clusterQueueNames,
      cache,
      projectDisplayNames,
      // scopeKey drives re-mapping when the selected cluster queue(s) change; cache identity
      // drives re-mapping when the underlying namespace data refreshes.
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey fingerprints scope; cache identity fingerprints namespace data
  }, [scopeKey, cache, cacheLoaded, projectDisplayNames]);

  const flattenedBaseRows = React.useMemo(
    () => [...baseWorkloadsByClusterQueue.values()].flat(),
    [baseWorkloadsByClusterQueue],
  );

  // --- Phase C: queue-position enrichment, decoupled from row mapping. ---
  const { data: positions, loaded: positionsLoaded } = useFetch<Map<QueuePositionKey, number>>(
    React.useCallback(async () => {
      if (!isClusterQueuesScope || flattenedBaseRows.length === 0) {
        return emptyPositions;
      }
      return fetchQueuePositions(flattenedBaseRows);
    }, [isClusterQueuesScope, flattenedBaseRows]),
    emptyPositions,
    { refreshRate, initialPromisePurity: true },
  );

  const clusterQueuesData = React.useMemo(
    (): WorkloadRowsFetchResult => ({
      mode: 'clusterQueues',
      workloadsByClusterQueue: applyQueuePositionsToMap(
        baseWorkloadsByClusterQueue,
        positions,
        positionsLoaded,
      ),
    }),
    [baseWorkloadsByClusterQueue, positions, positionsLoaded],
  );

  // --- Namespace scope: unchanged single fetch (rows + positions together). ---
  const {
    data: namespaceData,
    loaded: namespaceLoaded,
    error: namespaceError,
    refresh: namespaceRefresh,
  } = useFetch<WorkloadRowsFetchResult>(
    React.useCallback(async () => {
      const currentScope = scopeRef.current;
      if (currentScope.mode !== 'namespace') {
        throw new NotReadyError('Not in namespace scope');
      }
      if (!currentScope.namespace) {
        return { mode: 'namespace', workloads: [] };
      }

      const workloads = await fetchNamespaceWorkloads(
        currentScope.namespace,
        currentScope.projectDisplayName,
        dashboardNamespace,
      );
      return { mode: 'namespace', workloads };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey fingerprints namespace + display name
    }, [scopeKey, dashboardNamespace]),
    { mode: 'namespace', workloads: [] },
    { refreshRate, initialPromisePurity: true },
  );

  const clusterQueuesRefresh = React.useCallback(async (): Promise<
    WorkloadRowsFetchResult | undefined
  > => {
    const currentScope = scopeRef.current;
    if (currentScope.mode !== 'clusterQueues') {
      return {
        mode: 'clusterQueues',
        workloadsByClusterQueue: emptyWorkloadsByClusterQueue,
      };
    }

    const refreshedCache = await refreshCache();
    if (!refreshedCache) {
      return undefined;
    }

    const workloadsByClusterQueue = mapWorkloadsForClusterQueuesSync(
      currentScope.clusterQueueNames,
      refreshedCache,
      projectDisplayNames,
    );

    return {
      mode: 'clusterQueues',
      workloadsByClusterQueue: applyQueuePositionsToMap(
        workloadsByClusterQueue,
        positions,
        positionsLoaded,
      ),
    };
  }, [positions, positionsLoaded, projectDisplayNames, refreshCache]);

  if (scope.mode === 'namespace') {
    return {
      data: namespaceData,
      loaded: namespaceLoaded,
      error: namespaceError,
      refresh: namespaceRefresh,
    };
  }

  return {
    data: clusterQueuesData,
    loaded: isSkippedClusterQueueScope || cacheLoaded,
    error: isSkippedClusterQueueScope
      ? undefined
      : projectsError ?? cacheError ?? cache.namespaceLoadError,
    refresh: clusterQueuesRefresh,
  };
};

export default useWorkloadRows;

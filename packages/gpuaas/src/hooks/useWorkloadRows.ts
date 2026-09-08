import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { useProjects } from '@odh-dashboard/internal/api/k8s/projects';
import useFetch, {
  NotReadyError,
  type FetchStateObject,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import type { WorkloadRowsFetchResult, WorkloadRowsScope } from '../types';
import { INFRASTRUCTURE_REFRESH_INTERVAL } from '../const';
import {
  fetchNamespaceWorkloads,
  fetchWorkloadsForClusterQueues,
  getProjectDisplayName,
} from '../utils/clusterQueueWorkloads';
import { getKueueManagedDataScienceProjects } from '../utils/kueueProjects';

export type UseWorkloadRowsOptions = {
  /** When true, includes Complete and Failed workloads. Defaults to active-only. */
  includeTerminal?: boolean;
  refreshRate?: number;
};

export type UseWorkloadRowsResult = {
  data: WorkloadRowsFetchResult;
  loaded: boolean;
  error: Error | undefined;
  refresh: FetchStateObject<WorkloadRowsFetchResult>['refresh'];
};

const buildProjectDisplayNames = (projects: ProjectKind[]): Map<string, string> =>
  new Map(
    projects.flatMap((project) => {
      const namespace = project.metadata.name;
      return namespace ? [[namespace, getProjectDisplayName(project)] as const] : [];
    }),
  );

const buildNamespacesKey = (namespaces: string[]): string =>
  namespaces.toSorted((a, b) => a.localeCompare(b)).join('\0');

const buildProjectDisplayNamesKey = (projectDisplayNames: Map<string, string>): string =>
  [...projectDisplayNames.entries()]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([namespace, displayName]) => `${namespace}\0${displayName}`)
    .join('\n');

const buildClusterQueueNamesKey = (clusterQueueNames: string[]): string =>
  clusterQueueNames.toSorted((a, b) => a.localeCompare(b)).join('\0');

const buildNamespaceScopeKey = (namespace: string, projectDisplayName: string): string =>
  `${namespace}\0${projectDisplayName}`;

const getInitialFetchResult = (scope: WorkloadRowsScope): WorkloadRowsFetchResult =>
  scope.mode === 'namespace'
    ? { mode: 'namespace', workloads: [] }
    : { mode: 'clusterQueues', workloadsByClusterQueue: new Map() };

const buildScopeKey = (scope: WorkloadRowsScope): string => {
  if (scope.mode === 'namespace') {
    return buildNamespaceScopeKey(scope.namespace, scope.projectDisplayName);
  }
  return buildClusterQueueNamesKey(scope.clusterQueueNames);
};

/**
 * Core workload rows hook. Scope selects admin cluster-queue view or single-namespace view.
 */
const useWorkloadRows = (
  scope: WorkloadRowsScope,
  options: UseWorkloadRowsOptions = {},
): UseWorkloadRowsResult => {
  const { includeTerminal = false, refreshRate = INFRASTRUCTURE_REFRESH_INTERVAL } = options;
  const [allProjects, projectsLoaded, projectsError] = useProjects();

  const kueueProjects = React.useMemo(
    () => getKueueManagedDataScienceProjects(allProjects),
    [allProjects],
  );

  const projectDisplayNames = React.useMemo(
    () => buildProjectDisplayNames(kueueProjects),
    [kueueProjects],
  );

  const namespaces = React.useMemo(
    () =>
      kueueProjects.flatMap((project) => {
        const namespace = project.metadata.name;
        return namespace ? [namespace] : [];
      }),
    [kueueProjects],
  );

  const namespacesKey = React.useMemo(() => buildNamespacesKey(namespaces), [namespaces]);
  const projectDisplayNamesKey = React.useMemo(
    () => buildProjectDisplayNamesKey(projectDisplayNames),
    [projectDisplayNames],
  );
  const scopeKey = React.useMemo(() => buildScopeKey(scope), [scope]);

  const scopeRef = React.useRef(scope);
  scopeRef.current = scope;
  const namespacesRef = React.useRef(namespaces);
  namespacesRef.current = namespaces;
  const projectDisplayNamesRef = React.useRef(projectDisplayNames);
  projectDisplayNamesRef.current = projectDisplayNames;

  const initialFetchResult = React.useMemo(() => getInitialFetchResult(scope), [scope]);

  const {
    data,
    loaded: workloadsLoaded,
    error: workloadsError,
    refresh,
  } = useFetch<WorkloadRowsFetchResult>(
    React.useCallback(async () => {
      const currentScope = scopeRef.current;

      if (currentScope.mode === 'namespace') {
        if (!currentScope.namespace) {
          return { mode: 'namespace', workloads: [] };
        }

        const workloads = await fetchNamespaceWorkloads(
          currentScope.namespace,
          currentScope.projectDisplayName,
          includeTerminal,
        );
        return { mode: 'namespace', workloads };
      }

      if (currentScope.clusterQueueNames.length === 0) {
        return { mode: 'clusterQueues', workloadsByClusterQueue: new Map() };
      }

      if (!projectsLoaded) {
        throw new NotReadyError('Projects not loaded');
      }

      const workloadsByClusterQueue = await fetchWorkloadsForClusterQueues(
        currentScope.clusterQueueNames,
        namespacesRef.current,
        projectDisplayNamesRef.current,
        includeTerminal,
      );

      return { mode: 'clusterQueues', workloadsByClusterQueue };
      // scopeKey / namespacesKey / projectDisplayNamesKey are content fingerprints.
      // eslint-disable-next-line react-hooks/exhaustive-deps -- keys trigger refetch when inputs change
    }, [scopeKey, namespacesKey, projectDisplayNamesKey, includeTerminal, projectsLoaded]),
    initialFetchResult,
    { refreshRate, initialPromisePurity: true },
  );

  const isSkippedClusterQueueScope =
    scope.mode === 'clusterQueues' && scope.clusterQueueNames.length === 0;

  const loaded =
    scope.mode === 'namespace' || isSkippedClusterQueueScope
      ? workloadsLoaded
      : projectsLoaded && workloadsLoaded;
  const error =
    scope.mode === 'namespace' || isSkippedClusterQueueScope
      ? workloadsError
      : projectsError ?? workloadsError;

  return {
    data,
    loaded,
    error,
    refresh,
  };
};

export default useWorkloadRows;

import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { useProjects } from '@odh-dashboard/internal/api/k8s/projects';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import useFetch, {
  isCommonStateError,
  NotReadyError,
  type AdHocUpdate,
  type FetchStateObject,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import { INFRASTRUCTURE_MANUAL_REFRESH_ONLY, TREND_REFRESH_INTERVAL } from '../const';
import type { KueueNamespaceWorkloadCache } from '../utils/clusterQueueWorkloads';
import {
  clearWorkloadCacheStore,
  createWorkloadCacheStore,
  loadWorkloadCache,
  type WorkloadCacheMutableStore,
} from '../utils/loadWorkloadCache';
import { getKueueManagedDataScienceProjects } from '../utils/kueueProjects';

const emptyCache: KueueNamespaceWorkloadCache = {
  namespaceData: [],
  hardwareProfileByKey: new Map(),
  hardwareProfilesForMatching: [],
};

type WorkloadCacheFetchState = {
  cache: KueueNamespaceWorkloadCache;
  enrichmentReady: boolean;
};

const emptyFetchState: WorkloadCacheFetchState = {
  cache: emptyCache,
  enrichmentReady: false,
};

const buildNamespacesKey = (namespaces: Iterable<string>): string =>
  [...namespaces].toSorted((a, b) => a.localeCompare(b)).join('\0');

type KueueNamespaceWorkloadCacheContextValue = {
  cache: KueueNamespaceWorkloadCache;
  loaded: boolean;
  /** True once pod/ISVC/hardware-profile enrichment matches the latest base fetch. */
  enrichmentReady: boolean;
  error: Error | undefined;
  refresh: FetchStateObject<KueueNamespaceWorkloadCache>['refresh'];
};

const KueueNamespaceWorkloadCacheContext =
  React.createContext<KueueNamespaceWorkloadCacheContextValue>({
    cache: emptyCache,
    loaded: false,
    enrichmentReady: false,
    error: undefined,
    refresh: async () => emptyCache,
  });

type KueueNamespaceWorkloadCacheProviderProps = {
  children: React.ReactNode;
  /**
   * Cluster queues currently in view (e.g. the selected Quota usage cluster queue). Namespace
   * workload data is fetched only for namespaces with a LocalQueue targeting one of these cluster
   * queues (via a cheap, cluster-wide LocalQueue index), instead of every Kueue-managed namespace.
   * Empty array means inactive — no fetching happens.
   */
  clusterQueueNames: string[];
};

/**
 * Provides workload-related K8s data scoped to the namespaces relevant to the selected cluster
 * queue(s). Per-namespace bundles are cached across cluster-queue selections (in a ref, keyed by
 * namespace), so switching between cluster queues that share a namespace reuses already-fetched
 * data until the next refresh re-fetches all relevant namespaces in place.
 *
 * Loading is two-phase: base workloads, then enrichment. `loaded` stays false until enrichment
 * completes so Type/HW profile columns are not misleading. Updates use a single `loadWorkloadCache`
 * pipeline — manual refresh badge and a 5m timer when a cluster queue is selected.
 */
const KueueNamespaceWorkloadCacheProvider: React.FC<KueueNamespaceWorkloadCacheProviderProps> = ({
  children,
  clusterQueueNames,
}) => {
  const [allProjects, projectsLoaded, projectsError] = useProjects();
  const { dashboardNamespace } = useDashboardNamespace();
  const active = clusterQueueNames.length > 0;

  const namespaces = React.useMemo(() => {
    const kueueProjects = getKueueManagedDataScienceProjects(allProjects);
    return kueueProjects.flatMap((project: ProjectKind) => {
      const namespace = project.metadata.name;
      return namespace ? [namespace] : [];
    });
  }, [allProjects]);

  const kueueNamespaceSet = React.useMemo(() => new Set(namespaces), [namespaces]);
  const namespacesKey = React.useMemo(() => buildNamespacesKey(namespaces), [namespaces]);
  const clusterQueueNamesKey = React.useMemo(
    () => buildNamespacesKey(clusterQueueNames),
    [clusterQueueNames],
  );

  const storeRef = React.useRef<WorkloadCacheMutableStore>(createWorkloadCacheStore());
  const invalidateOnNextLoadRef = React.useRef(false);
  const loadCompletionRef = React.useRef<Promise<KueueNamespaceWorkloadCache>>();
  const clusterQueueNamesKeyRef = React.useRef(clusterQueueNamesKey);

  React.useEffect(() => {
    if (clusterQueueNamesKeyRef.current === clusterQueueNamesKey) {
      return;
    }
    clusterQueueNamesKeyRef.current = clusterQueueNamesKey;
    storeRef.current.stripEnrichmentOnClusterQueueSwitch();
  }, [clusterQueueNamesKey]);

  const clusterQueueNamesRef = React.useRef(clusterQueueNames);
  clusterQueueNamesRef.current = clusterQueueNames;
  const kueueNamespaceSetRef = React.useRef(kueueNamespaceSet);
  kueueNamespaceSetRef.current = kueueNamespaceSet;
  const dashboardNamespaceRef = React.useRef(dashboardNamespace);
  dashboardNamespaceRef.current = dashboardNamespace;

  const [pipelineError, setPipelineError] = React.useState<Error | undefined>();

  const {
    data: fetchState = emptyFetchState,
    error: fetchError,
    refresh: refreshFetch,
  } = useFetch<WorkloadCacheFetchState | AdHocUpdate<WorkloadCacheFetchState>>(
    React.useCallback(async () => {
      setPipelineError(undefined);

      if (!active) {
        return { cache: emptyCache, enrichmentReady: true };
      }
      if (!projectsLoaded) {
        throw new NotReadyError('Projects not loaded');
      }

      const invalidateBundles = invalidateOnNextLoadRef.current;
      if (invalidateBundles) {
        clearWorkloadCacheStore(storeRef.current);
      }
      invalidateOnNextLoadRef.current = false;

      const loadParams = {
        clusterQueueNames: clusterQueueNamesRef.current,
        kueueNamespaceSet: kueueNamespaceSetRef.current,
        dashboardNamespace: dashboardNamespaceRef.current,
        store: storeRef.current,
        invalidateBundles,
      };

      return new Promise<AdHocUpdate<WorkloadCacheFetchState>>((resolve, reject) => {
        let adHocDelivered = false;

        const handlePipelineFailure = (reason: unknown) => {
          if (reason instanceof Error && isCommonStateError(reason)) {
            return;
          }
          const error = reason instanceof Error ? reason : new Error(String(reason));
          if (!adHocDelivered) {
            reject(error);
            return;
          }
          setPipelineError(error);
        };

        const loadPromise = loadWorkloadCache({
          ...loadParams,
          onBaseCache: (base) => {
            resolve((setStateLater) => {
              adHocDelivered = true;
              setStateLater(() => ({
                cache: base,
                enrichmentReady: base.namespaceData.length === 0,
              }));
              void loadPromise
                .then((enriched) => {
                  setPipelineError(undefined);
                  setStateLater(() => ({ cache: enriched, enrichmentReady: true }));
                })
                .catch(handlePipelineFailure);
            });
          },
        });
        loadCompletionRef.current = loadPromise;

        void loadPromise.catch((reason) => {
          if (!adHocDelivered) {
            handlePipelineFailure(reason);
          }
        });
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps -- keys fingerprint selection/namespace inputs
    }, [active, projectsLoaded, clusterQueueNamesKey, namespacesKey]),
    emptyFetchState,
    {
      refreshRate: active ? INFRASTRUCTURE_MANUAL_REFRESH_ONLY : -1,
      initialPromisePurity: true,
    },
  );

  const resolvedState: WorkloadCacheFetchState =
    typeof fetchState === 'function' ? emptyFetchState : fetchState;

  const refresh = React.useCallback(async () => {
    if (!active) {
      return undefined;
    }
    invalidateOnNextLoadRef.current = true;
    const refreshPromise = refreshFetch();
    const loadCompletion = loadCompletionRef.current;
    await refreshPromise;
    if (!loadCompletion) {
      return undefined;
    }
    try {
      return await loadCompletion;
    } catch {
      return undefined;
    }
  }, [active, refreshFetch]);

  React.useEffect(() => {
    if (!active) {
      return undefined;
    }
    const intervalId = setInterval(() => {
      invalidateOnNextLoadRef.current = true;
      void refreshFetch();
    }, TREND_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [active, refreshFetch]);

  const { cache, enrichmentReady } = resolvedState;

  const value = React.useMemo(
    (): KueueNamespaceWorkloadCacheContextValue => ({
      cache,
      loaded: active && projectsLoaded && enrichmentReady,
      enrichmentReady,
      error: projectsError ?? fetchError ?? pipelineError ?? cache.namespaceLoadError,
      refresh,
    }),
    [
      active,
      cache,
      enrichmentReady,
      fetchError,
      pipelineError,
      projectsError,
      projectsLoaded,
      refresh,
    ],
  );

  return (
    <KueueNamespaceWorkloadCacheContext.Provider value={value}>
      {children}
    </KueueNamespaceWorkloadCacheContext.Provider>
  );
};

export const useKueueNamespaceWorkloadCache = (): KueueNamespaceWorkloadCacheContextValue =>
  React.useContext(KueueNamespaceWorkloadCacheContext);

export default KueueNamespaceWorkloadCacheProvider;

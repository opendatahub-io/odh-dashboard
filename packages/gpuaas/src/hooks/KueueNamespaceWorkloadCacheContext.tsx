import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { useProjects } from '@odh-dashboard/internal/api/k8s/projects';
import { listResourceFlavors } from '@odh-dashboard/internal/api/k8s/resourceFlavors';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import useFetch, {
  NotReadyError,
  type FetchStateObject,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import { INFRASTRUCTURE_MANUAL_REFRESH_ONLY } from '../const';
import { buildResourceFlavorByName } from '../utils/hardwareModels';
import {
  collectHardwareProfileRefs,
  enrichNamespaceWorkloadData,
  fetchHardwareProfilesByKey,
  fetchHardwareProfilesForMatching,
  fetchLocalQueueClusterQueueIndex,
  fetchNamespaceWorkloadBaseData,
  getNamespacesForClusterQueues,
  toNamespaceWorkloadData,
  type HardwareProfileByKey,
  type KueueNamespaceWorkloadCache,
  type LocalQueueClusterQueueIndex,
  type NamespaceWorkloadBaseData,
} from '../utils/clusterQueueWorkloads';
import {
  applyNamespaceEnrichment,
  createNamespaceBundleState,
  toDisplayBundle,
  type NamespaceBundleState,
  type NamespaceWorkloadEnrichment,
} from '../utils/namespaceBundleState';
import { getKueueManagedDataScienceProjects } from '../utils/kueueProjects';

const emptyCache: KueueNamespaceWorkloadCache = {
  namespaceData: [],
  resourceFlavorByName: new Map(),
  hardwareProfileByKey: new Map(),
  hardwareProfilesForMatching: [],
};

const emptyIndex: LocalQueueClusterQueueIndex = new Map();

const buildNamespacesKey = (namespaces: Iterable<string>): string =>
  [...namespaces].toSorted((a, b) => a.localeCompare(b)).join('\0');

const buildNamespaceLoadError = (failures: { namespace: string; error: Error }[]): Error =>
  new Error(
    `Failed to load workloads for: ${failures
      .map(({ namespace, error }) => `${namespace} (${error.message})`)
      .join('; ')}`,
  );

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
 * Loading is two-phase: B1 fetches workloads + LocalQueues; B2 enriches with pods, StatefulSets,
 * InferenceServices, job-kind indexes, and hardware profiles. `loaded` stays false until B2
 * completes for the current base generation so Type/HW profile columns are not misleading.
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

  // Phase A: cheap, cluster-wide LocalQueue index — only when a cluster queue is selected.
  const {
    data: index,
    loaded: indexLoaded,
    error: indexError,
    refresh: refreshIndex,
  } = useFetch<LocalQueueClusterQueueIndex>(
    React.useCallback(async () => {
      if (!active) {
        return emptyIndex;
      }
      return fetchLocalQueueClusterQueueIndex();
    }, [active]),
    emptyIndex,
    {
      refreshRate: active ? INFRASTRUCTURE_MANUAL_REFRESH_ONLY : -1,
      initialPromisePurity: true,
    },
  );

  const namespaceBundleStateRef = React.useRef(new Map<string, NamespaceBundleState>());
  const hardwareProfileCacheRef = React.useRef<HardwareProfileByKey>(new Map());
  const hardwareProfilesForMatchingCacheRef = React.useRef<
    KueueNamespaceWorkloadCache['hardwareProfilesForMatching']
  >([]);
  /** Bumps on each B1 completion; B2 must match before enriched cache is shown (avoids stale enrich on CQ switch / refresh). */
  const baseFetchGenerationRef = React.useRef(0);
  const enrichedFetchGenerationRef = React.useRef(0);
  const clusterQueueNamesKeyRef = React.useRef(clusterQueueNamesKey);
  const dashboardNamespaceRef = React.useRef(dashboardNamespace);
  dashboardNamespaceRef.current = dashboardNamespace;

  React.useEffect(() => {
    if (clusterQueueNamesKeyRef.current === clusterQueueNamesKey) {
      return;
    }
    clusterQueueNamesKeyRef.current = clusterQueueNamesKey;
    for (const [namespace, state] of namespaceBundleStateRef.current) {
      namespaceBundleStateRef.current.set(namespace, { base: state.base });
    }
    hardwareProfileCacheRef.current.clear();
    hardwareProfilesForMatchingCacheRef.current = [];
    enrichedFetchGenerationRef.current = 0;
  }, [clusterQueueNamesKey]);

  const clusterQueueNamesRef = React.useRef(clusterQueueNames);
  clusterQueueNamesRef.current = clusterQueueNames;
  const kueueNamespaceSetRef = React.useRef(kueueNamespaceSet);
  kueueNamespaceSetRef.current = kueueNamespaceSet;
  const indexRef = React.useRef(index);
  indexRef.current = index;

  // Phase B1: workloads + LocalQueues — optimistic enrichment reuse while B2 catches up.
  const {
    data: baseCache,
    loaded: baseLoaded,
    error: baseError,
    refresh: refreshBase,
  } = useFetch<KueueNamespaceWorkloadCache>(
    React.useCallback(async () => {
      if (!active) {
        return emptyCache;
      }
      if (!projectsLoaded || !indexLoaded) {
        throw new NotReadyError('Projects or LocalQueue index not loaded');
      }

      const relevantNamespaces = [
        ...getNamespacesForClusterQueues(clusterQueueNamesRef.current, indexRef.current),
      ].filter((namespace) => kueueNamespaceSetRef.current.has(namespace));

      const pendingBaseGeneration = baseFetchGenerationRef.current + 1;

      const [fetchResults, resourceFlavors] = await Promise.all([
        Promise.all(
          relevantNamespaces.map(async (namespace) => {
            try {
              const previousState = namespaceBundleStateRef.current.get(namespace);
              let base = previousState?.base;
              if (!base) {
                base = await fetchNamespaceWorkloadBaseData(namespace);
              }
              const nextState = createNamespaceBundleState(base, previousState);
              namespaceBundleStateRef.current.set(namespace, nextState);
              const bundle = toDisplayBundle(nextState, pendingBaseGeneration, true);
              return { namespace, bundle, error: undefined };
            } catch (error) {
              return {
                namespace,
                bundle: undefined,
                error: error instanceof Error ? error : new Error(String(error)),
              };
            }
          }),
        ),
        listResourceFlavors(),
      ]);

      const failures = fetchResults.flatMap((result) =>
        result.error ? [{ namespace: result.namespace, error: result.error }] : [],
      );

      const namespaceData = relevantNamespaces.flatMap((namespace) => {
        const state = namespaceBundleStateRef.current.get(namespace);
        return state ? [toDisplayBundle(state, pendingBaseGeneration, true)] : [];
      });

      const namespaceLoadError =
        failures.length > 0 ? buildNamespaceLoadError(failures) : undefined;

      baseFetchGenerationRef.current = pendingBaseGeneration;

      return {
        namespaceData,
        resourceFlavorByName: buildResourceFlavorByName(resourceFlavors),
        hardwareProfileByKey: new Map(hardwareProfileCacheRef.current),
        hardwareProfilesForMatching: hardwareProfilesForMatchingCacheRef.current,
        namespaceLoadError,
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- keys fingerprint selection/namespace inputs
    }, [active, projectsLoaded, indexLoaded, clusterQueueNamesKey, namespacesKey]),
    emptyCache,
    {
      refreshRate: active ? INFRASTRUCTURE_MANUAL_REFRESH_ONLY : -1,
      initialPromisePurity: true,
    },
  );

  const baseCacheRef = React.useRef(baseCache);
  baseCacheRef.current = baseCache;

  // Phase B2: lazy pods/STS/ISVC/job lists + hardware profiles.
  const { data: enrichedCache, refresh: refreshEnriched } = useFetch<KueueNamespaceWorkloadCache>(
    React.useCallback(async () => {
      if (!active || !baseLoaded) {
        throw new NotReadyError('Base namespace workload cache not loaded');
      }

      const baseNamespaceData = baseCacheRef.current.namespaceData;
      if (baseNamespaceData.length === 0) {
        return baseCacheRef.current;
      }

      const baseGeneration = baseFetchGenerationRef.current;

      const enrichResults = await Promise.all(
        baseNamespaceData.map(async (baseBundle) => {
          const state = namespaceBundleStateRef.current.get(baseBundle.namespace);
          const base: NamespaceWorkloadBaseData = state?.base ?? {
            namespace: baseBundle.namespace,
            workloads: baseBundle.workloads,
            localQueues: baseBundle.localQueues,
          };
          try {
            const enriched = await enrichNamespaceWorkloadData(base, clusterQueueNamesRef.current);
            const enrichment: NamespaceWorkloadEnrichment = {
              pods: enriched.pods,
              statefulSets: enriched.statefulSets,
              inferenceServices: enriched.inferenceServices,
              jobKindByUid: enriched.jobKindByUid,
            };
            const updatedState = applyNamespaceEnrichment(
              state ?? { base },
              enrichment,
              baseGeneration,
            );
            namespaceBundleStateRef.current.set(base.namespace, updatedState);
            return toDisplayBundle(updatedState, baseGeneration);
          } catch {
            return toNamespaceWorkloadData(base);
          }
        }),
      );

      const [fetchedHardwareProfiles, hardwareProfilesForMatching] = await Promise.all([
        fetchHardwareProfilesByKey(collectHardwareProfileRefs(enrichResults)),
        fetchHardwareProfilesForMatching(enrichResults, dashboardNamespaceRef.current),
      ]);
      for (const [key, hardwareProfile] of fetchedHardwareProfiles) {
        hardwareProfileCacheRef.current.set(key, hardwareProfile);
      }
      hardwareProfilesForMatchingCacheRef.current = hardwareProfilesForMatching;

      if (baseGeneration !== baseFetchGenerationRef.current) {
        throw new NotReadyError('Base generation advanced during enrichment');
      }
      enrichedFetchGenerationRef.current = baseGeneration;

      return {
        namespaceData: enrichResults,
        resourceFlavorByName: baseCacheRef.current.resourceFlavorByName,
        hardwareProfileByKey: new Map(hardwareProfileCacheRef.current),
        hardwareProfilesForMatching,
        namespaceLoadError: baseCacheRef.current.namespaceLoadError,
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- keys fingerprint selection inputs
    }, [active, baseLoaded, clusterQueueNamesKey, namespacesKey]),
    emptyCache,
    {
      refreshRate: active ? INFRASTRUCTURE_MANUAL_REFRESH_ONLY : -1,
      initialPromisePurity: true,
    },
  );

  const isEnrichedCurrent =
    enrichedCache.namespaceData.length > 0 &&
    enrichedFetchGenerationRef.current === baseFetchGenerationRef.current;

  const enrichmentReady = !active || baseCache.namespaceData.length === 0 || isEnrichedCurrent;

  const cache = isEnrichedCurrent ? enrichedCache : baseCache;

  const refresh = React.useCallback(async () => {
    if (active) {
      namespaceBundleStateRef.current.clear();
      hardwareProfileCacheRef.current.clear();
      hardwareProfilesForMatchingCacheRef.current = [];
      enrichedFetchGenerationRef.current = 0;
      await refreshIndex();
    }
    await refreshBase();
    return refreshEnriched();
  }, [active, refreshBase, refreshEnriched, refreshIndex]);

  const value = React.useMemo(
    (): KueueNamespaceWorkloadCacheContextValue => ({
      cache,
      loaded: active && projectsLoaded && indexLoaded && baseLoaded && enrichmentReady,
      enrichmentReady,
      error: projectsError ?? indexError ?? baseError ?? cache.namespaceLoadError,
      refresh,
    }),
    [
      active,
      cache,
      baseLoaded,
      baseError,
      enrichmentReady,
      indexLoaded,
      indexError,
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

import { NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetch';
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
} from './clusterQueueWorkloads';
import {
  applyNamespaceEnrichment,
  createNamespaceBundleState,
  toDisplayBundle,
  type NamespaceBundleState,
  type NamespaceWorkloadEnrichment,
} from './namespaceBundleState';

const buildNamespaceLoadError = (failures: { namespace: string; error: Error }[]): Error =>
  new Error(
    `Failed to load workloads for: ${failures
      .map(({ namespace, error }) => `${namespace} (${error.message})`)
      .join('; ')}`,
  );

/** Mutable session state for namespace bundles, HW profile cache, and fetch generations. */
export class WorkloadCacheSession {
  namespaceBundleState = new Map<string, NamespaceBundleState>();

  hardwareProfileByKey: HardwareProfileByKey = new Map();

  hardwareProfilesForMatching: KueueNamespaceWorkloadCache['hardwareProfilesForMatching'] = [];

  baseFetchGeneration = 0;

  enrichedFetchGeneration = 0;

  clearForRefresh(): void {
    this.namespaceBundleState.clear();
    this.hardwareProfileByKey.clear();
    this.hardwareProfilesForMatching = [];
    this.enrichedFetchGeneration = 0;
  }

  /** Drop enrichment when the selected cluster queue set changes; keep fetched base per namespace. */
  stripEnrichmentOnClusterQueueSwitch(): void {
    for (const [namespace, state] of this.namespaceBundleState) {
      this.namespaceBundleState.set(namespace, { base: state.base });
    }
    this.hardwareProfileByKey.clear();
    this.hardwareProfilesForMatching = [];
    this.enrichedFetchGeneration = 0;
  }

  bumpBaseGeneration(): number {
    this.baseFetchGeneration += 1;
    return this.baseFetchGeneration;
  }

  markEnrichedForCurrentBase(): void {
    this.enrichedFetchGeneration = this.baseFetchGeneration;
  }

  setHardwareProfilesForMatching(
    hardwareProfilesForMatching: KueueNamespaceWorkloadCache['hardwareProfilesForMatching'],
  ): void {
    this.hardwareProfilesForMatching = hardwareProfilesForMatching;
  }
}

export type WorkloadCacheMutableStore = WorkloadCacheSession;

export const createWorkloadCacheStore = (): WorkloadCacheSession => new WorkloadCacheSession();

export const clearWorkloadCacheStore = (store: WorkloadCacheSession): void => {
  store.clearForRefresh();
};

export const stripEnrichmentOnClusterQueueSwitch = (store: WorkloadCacheSession): void => {
  store.stripEnrichmentOnClusterQueueSwitch();
};

export type LoadWorkloadCacheParams = {
  clusterQueueNames: string[];
  kueueNamespaceSet: Set<string>;
  dashboardNamespace: string;
  store: WorkloadCacheSession;
  /** When true, refetch base data for every namespace (manual refresh / interval). */
  invalidateBundles: boolean;
  onBaseCache?: (cache: KueueNamespaceWorkloadCache) => void;
};

const fetchBaseCache = async (
  index: LocalQueueClusterQueueIndex,
  params: LoadWorkloadCacheParams,
  pendingBaseGeneration: number,
): Promise<KueueNamespaceWorkloadCache> => {
  const { clusterQueueNames, kueueNamespaceSet, store, invalidateBundles } = params;

  const relevantNamespaces = [...getNamespacesForClusterQueues(clusterQueueNames, index)].filter(
    (namespace) => kueueNamespaceSet.has(namespace),
  );

  const fetchResults = await Promise.all(
    relevantNamespaces.map(async (namespace) => {
      try {
        const previousState = store.namespaceBundleState.get(namespace);
        let baseData = previousState?.base;
        if (!baseData || invalidateBundles) {
          baseData = await fetchNamespaceWorkloadBaseData(namespace);
        }
        const nextState = createNamespaceBundleState(baseData, previousState);
        if (pendingBaseGeneration === store.baseFetchGeneration) {
          store.namespaceBundleState.set(namespace, nextState);
        }
        return { namespace, error: undefined };
      } catch (error) {
        return {
          namespace,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    }),
  );

  if (pendingBaseGeneration !== store.baseFetchGeneration) {
    throw new NotReadyError('Base generation advanced during base fetch');
  }

  const failures = fetchResults.flatMap((result) =>
    result.error ? [{ namespace: result.namespace, error: result.error }] : [],
  );

  const namespaceData = relevantNamespaces.flatMap((namespace) => {
    const state = store.namespaceBundleState.get(namespace);
    return state ? [toDisplayBundle(state, pendingBaseGeneration, true)] : [];
  });

  return {
    namespaceData,
    hardwareProfileByKey: new Map(store.hardwareProfileByKey),
    hardwareProfilesForMatching: store.hardwareProfilesForMatching,
    namespaceLoadError: failures.length > 0 ? buildNamespaceLoadError(failures) : undefined,
  };
};

const enrichCache = async (
  baseCache: KueueNamespaceWorkloadCache,
  params: LoadWorkloadCacheParams,
): Promise<KueueNamespaceWorkloadCache> => {
  const { clusterQueueNames, dashboardNamespace, store } = params;
  const baseGeneration = store.baseFetchGeneration;

  const enrichResultsWithErrors = await Promise.all(
    baseCache.namespaceData.map(async (baseBundle) => {
      const state = store.namespaceBundleState.get(baseBundle.namespace);
      const base: NamespaceWorkloadBaseData = state?.base ?? {
        namespace: baseBundle.namespace,
        workloads: baseBundle.workloads,
        localQueues: baseBundle.localQueues,
      };
      try {
        const enriched = await enrichNamespaceWorkloadData(base, clusterQueueNames);
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
        if (baseGeneration === store.baseFetchGeneration) {
          store.namespaceBundleState.set(base.namespace, updatedState);
        }
        return { data: toDisplayBundle(updatedState, baseGeneration), error: undefined };
      } catch (error) {
        return {
          data: toNamespaceWorkloadData(base),
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    }),
  );

  const enrichmentFailures = enrichResultsWithErrors.flatMap(({ data, error }) =>
    error ? [{ namespace: data.namespace, error }] : [],
  );
  const enrichResults = enrichResultsWithErrors.map(({ data }) => data);

  const [fetchedHardwareProfiles, hardwareProfilesForMatching] = await Promise.all([
    fetchHardwareProfilesByKey(collectHardwareProfileRefs(enrichResults)),
    fetchHardwareProfilesForMatching(enrichResults, dashboardNamespace),
  ]);
  if (baseGeneration !== store.baseFetchGeneration) {
    throw new NotReadyError('Base generation advanced during enrichment');
  }
  for (const [key, hardwareProfile] of fetchedHardwareProfiles) {
    store.hardwareProfileByKey.set(key, hardwareProfile);
  }
  store.setHardwareProfilesForMatching(hardwareProfilesForMatching);
  store.markEnrichedForCurrentBase();

  return {
    namespaceData: enrichResults,
    hardwareProfileByKey: new Map(store.hardwareProfileByKey),
    hardwareProfilesForMatching,
    namespaceLoadError:
      baseCache.namespaceLoadError || enrichmentFailures.length > 0
        ? buildNamespaceLoadError([
            ...(baseCache.namespaceLoadError
              ? [{ namespace: 'base data', error: baseCache.namespaceLoadError }]
              : []),
            ...enrichmentFailures,
          ])
        : undefined,
  };
};

/**
 * Cluster-wide LocalQueue index, scoped namespace base fetch, then enrichment (pods, ISVC, HW).
 */
export const loadWorkloadCache = async (
  params: LoadWorkloadCacheParams,
): Promise<KueueNamespaceWorkloadCache> => {
  const pendingBaseGeneration = params.store.bumpBaseGeneration();
  const index = await fetchLocalQueueClusterQueueIndex();
  const baseCache = await fetchBaseCache(index, params, pendingBaseGeneration);
  params.onBaseCache?.(baseCache);

  if (baseCache.namespaceData.length === 0) {
    return baseCache;
  }

  return enrichCache(baseCache, params);
};

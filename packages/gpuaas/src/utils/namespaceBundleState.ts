import type { WorkloadKind } from '@odh-dashboard/k8s-core';
import {
  emptyNamespaceEnrichment,
  toNamespaceWorkloadData,
  type NamespaceWorkloadBaseData,
  type NamespaceWorkloadData,
} from './clusterQueueWorkloads';

export type NamespaceWorkloadEnrichment = Pick<
  NamespaceWorkloadData,
  'pods' | 'statefulSets' | 'inferenceServices' | 'jobKindByUid'
>;

/** Per-namespace snapshot with generation-tracked enrichment validity. */
export type NamespaceBundleState = {
  base: NamespaceWorkloadBaseData;
  enrichment?: NamespaceWorkloadEnrichment;
  /** Matches the global base fetch generation when enrichment is confirmed for the current base. */
  enrichedForBaseGeneration?: number;
};

export const hasNamespaceEnrichmentData = (enrichment?: NamespaceWorkloadEnrichment): boolean =>
  !!enrichment &&
  (enrichment.pods.length > 0 ||
    enrichment.inferenceServices.length > 0 ||
    enrichment.statefulSets.length > 0 ||
    enrichment.jobKindByUid.size > 0);

const workloadIdentityKey = (workloads: WorkloadKind[]): string =>
  workloads
    .map((workload) => workload.metadata?.uid ?? workload.metadata?.name ?? '')
    .filter(Boolean)
    .toSorted((a, b) => a.localeCompare(b))
    .join('\0');

/** Reuse enrichment only when the underlying workload set is unchanged. */
export const canPreserveNamespaceEnrichment = (
  previous: NamespaceBundleState | undefined,
  base: NamespaceWorkloadBaseData,
): previous is NamespaceBundleState & { enrichment: NamespaceWorkloadEnrichment } =>
  !!previous?.enrichment &&
  hasNamespaceEnrichmentData(previous.enrichment) &&
  workloadIdentityKey(previous.base.workloads) === workloadIdentityKey(base.workloads);

export const createNamespaceBundleState = (
  base: NamespaceWorkloadBaseData,
  previous?: NamespaceBundleState,
): NamespaceBundleState => {
  if (!previous || !canPreserveNamespaceEnrichment(previous, base)) {
    return { base };
  }

  return {
    base,
    enrichment: previous.enrichment,
    enrichedForBaseGeneration: previous.enrichedForBaseGeneration,
  };
};

export const applyNamespaceEnrichment = (
  state: NamespaceBundleState,
  enrichment: NamespaceWorkloadEnrichment,
  baseGeneration: number,
): NamespaceBundleState => ({
  ...state,
  enrichment,
  enrichedForBaseGeneration: baseGeneration,
});

/**
 * Builds the namespace bundle for display. When `optimisticWhileEnriching` is true, stale
 * enrichment may be shown during B2 if workload identities still match (CQ switch UX).
 */
export const toDisplayBundle = (
  state: NamespaceBundleState,
  baseGeneration: number,
  optimisticWhileEnriching = false,
): NamespaceWorkloadData => {
  const enrichmentMatchesGeneration = state.enrichedForBaseGeneration === baseGeneration;
  const enrichment =
    state.enrichment &&
    (enrichmentMatchesGeneration || optimisticWhileEnriching) &&
    hasNamespaceEnrichmentData(state.enrichment)
      ? state.enrichment
      : undefined;

  return toNamespaceWorkloadData(state.base, enrichment ?? emptyNamespaceEnrichment());
};

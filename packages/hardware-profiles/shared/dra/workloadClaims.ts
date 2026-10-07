import type { PodKind } from '@odh-dashboard/k8s-core';
import { getDeclaredClaimReferences, resolvePodClaim } from './claimResolution';
import type { DraLookups, PodClaimSpec, WorkloadClaimGroup } from './types';

const FINISHED_PHASES = new Set(['Failed', 'Succeeded']);

/** Terminating or finished Pods never carry a live allocation. */
export const isLivePod = (pod: PodKind): boolean =>
  !pod.metadata.deletionTimestamp && !FINISHED_PHASES.has(pod.status?.phase ?? '');

/** Prefers the Pod the host already treats as running; otherwise the newest live Pod, name as tiebreak. */
export const selectWorkloadPod = (pods: PodKind[], preferredUid?: string): PodKind | undefined => {
  const preferred = preferredUid
    ? pods.find((pod) => pod.metadata.uid === preferredUid && isLivePod(pod))
    : undefined;
  if (preferred) {
    return preferred;
  }
  return pods
    .filter(isLivePod)
    .toSorted(
      (a, b) =>
        (b.metadata.creationTimestamp ?? '').localeCompare(a.metadata.creationTimestamp ?? '') ||
        a.metadata.name.localeCompare(b.metadata.name),
    )[0];
};

export type WorkloadClaimSource =
  /** A real Pod: generated claim names and node come from it. */
  | { pod: PodKind }
  /** No Pod: only the declared references and their requested configuration are known. */
  | { spec: PodClaimSpec };

export type WorkloadClaimOptions = {
  /** Containers whose `resources.claims` scope the shown requests; every declared claim is still resolved. */
  containerNames?: string[];
};

/** Resolves every declared claim; Kubernetes allocates them all whether or not a container uses them. */
export const resolveWorkloadClaims = (
  source: WorkloadClaimSource,
  lookups: DraLookups,
  { containerNames }: WorkloadClaimOptions = {},
): WorkloadClaimGroup => {
  const spec = 'pod' in source ? source.pod.spec : source.spec;
  const statuses = 'pod' in source ? source.pod.status?.resourceClaimStatuses : undefined;
  const containerFilter = containerNames ? new Set(containerNames) : undefined;
  return {
    pod:
      'pod' in source
        ? { name: source.pod.metadata.name, nodeName: source.pod.spec.nodeName }
        : undefined,
    claims: getDeclaredClaimReferences(spec, statuses).map((reference) => {
      const scoped = containerFilter
        ? reference.consumers.filter((consumer) => containerFilter.has(consumer.containerName))
        : reference.consumers;
      // Request scoping follows only the relevant containers; the reference keeps every consumer for display.
      const resolved = resolvePodClaim({ ...reference, consumers: scoped }, lookups);
      return { ...resolved, reference };
    }),
  };
};

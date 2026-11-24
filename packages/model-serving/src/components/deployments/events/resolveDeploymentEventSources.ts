import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';

/** Find the deployment and all descendants reachable in the already-fetched candidates. */
export const resolveDeploymentEventSources = (
  rootUid: string,
  candidates: readonly K8sResourceCommon[],
): string[] => {
  // Kubernetes stores owner references on children. Reverse those links so we can
  // look up a resource's children by UID, regardless of kind or fetch order.
  const childrenByOwner = new Map<string, Set<string>>();
  for (const { metadata } of candidates) {
    if (
      typeof metadata?.uid !== 'string' ||
      !metadata.uid ||
      !Array.isArray(metadata.ownerReferences)
    ) {
      continue;
    }
    const owners: readonly unknown[] = metadata.ownerReferences;
    for (const owner of owners) {
      if (
        owner &&
        typeof owner === 'object' &&
        'uid' in owner &&
        typeof owner.uid === 'string' &&
        owner.uid
      ) {
        const children = childrenByOwner.get(owner.uid) ?? new Set<string>();
        children.add(metadata.uid);
        childrenByOwner.set(owner.uid, children);
      }
    }
  }

  const reachable = new Set([rootUid]);
  // JavaScript's Set iterator is live: reachable.add(childUid) appends a new UID
  // that this same for...of loop will visit later. Adding a UID already in the Set
  // doesn't add another entry, so we never visit it twice.
  for (const uid of reachable) {
    childrenByOwner.get(uid)?.forEach((childUid) => reachable.add(childUid));
  }
  return [...reachable];
};

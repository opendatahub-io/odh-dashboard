import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';

export const resolveDeploymentEventSources = (
  rootUid: string,
  candidates: readonly K8sResourceCommon[],
): string[] => {
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
  // Iterating a Set also visits children added during the walk.
  for (const uid of reachable) {
    childrenByOwner.get(uid)?.forEach((childUid) => reachable.add(childUid));
  }
  return [...reachable];
};

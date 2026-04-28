import type { K8sResourceCommon } from '@odh-dashboard/internal/k8sTypes';
import { MaaSSubscription } from '~/app/types/subscriptions';
/**
 * Returns the lowest non-negative integer priority not already taken by existing subscriptions.
 * Starts scanning from `startFrom` (default 0) and increments until a free slot is found.
 */
export const getLowestAvailablePriority = (
  subscriptions: { priority?: number }[],
  startFrom = 0,
): number => {
  const taken = new Set(subscriptions.map((s) => s.priority ?? 0));
  let p = startFrom;
  while (taken.has(p)) {
    p += 1;
  }
  return p;
};

export const convertSubscriptionToK8sResource = (
  subscription: MaaSSubscription,
): K8sResourceCommon => ({
  apiVersion: 'maas.opendatahub.io/v1alpha1',
  kind: 'MaaSSubscription',
  metadata: { name: subscription.name },
});

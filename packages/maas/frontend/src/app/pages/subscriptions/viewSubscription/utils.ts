import { ModelSubscriptionRef } from '~/app/types/subscriptions';
import { formatTokenRateLimitLine } from '~/app/utilities/rateLimits';

export const findModelSubscriptionRef = (
  modelRefs: ModelSubscriptionRef[],
  namespace: string,
  name: string,
): ModelSubscriptionRef | undefined =>
  modelRefs.find((r) => r.namespace === namespace && r.name === name);

export const formatTokenLimits = (
  modelRefs: ModelSubscriptionRef[],
  namespace: string,
  name: string,
): string[] => {
  const ref = findModelSubscriptionRef(modelRefs, namespace, name);
  const limits = ref && Array.isArray(ref.tokenRateLimits) ? ref.tokenRateLimits : [];
  return limits.map(({ limit, window }) => formatTokenRateLimitLine(limit, window));
};

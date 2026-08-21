import { ModelSubscriptionRef } from '~/app/types/subscriptions';
import { formatTokenRateLimitLine } from '~/app/utilities/rateLimits';

export const formatTokenLimits = (
  modelRefs: ModelSubscriptionRef[],
  namespace: string,
  name: string,
): string[] => {
  const ref = modelRefs.find((r) => r.namespace === namespace && r.name === name);
  const limits = ref && Array.isArray(ref.tokenRateLimits) ? ref.tokenRateLimits : [];
  return limits.map(({ limit, window }) => formatTokenRateLimitLine(limit, window));
};

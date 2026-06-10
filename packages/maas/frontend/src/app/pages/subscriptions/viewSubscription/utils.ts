import { ModelSubscriptionRef } from '~/app/types/subscriptions';
import { formatWindow } from '~/app/utilities/rateLimits';

export const formatTokenLimits = (
  modelRefs: ModelSubscriptionRef[],
  namespace: string,
  name: string,
): string[] => {
  const ref = modelRefs.find((r) => r.namespace === namespace && r.name === name);
  const limits = ref && Array.isArray(ref.tokenRateLimits) ? ref.tokenRateLimits : [];
  return limits.map(
    ({ limit, window }) => `${limit.toLocaleString('en-US')} / ${formatWindow(window)}`,
  );
};

import { ModelSubscriptionRef } from '~/app/types/subscriptions';

export const formatTokenLimits = (
  modelRefs: ModelSubscriptionRef[],
  namespace: string,
  name: string,
): string => {
  const ref = modelRefs.find((r) => r.namespace === namespace && r.name === name);
  if (!ref || !ref.tokenRateLimits || ref.tokenRateLimits.length === 0) {
    return 'Unlimited';
  }
  const { limit, window } = ref.tokenRateLimits[0];
  return `${limit.toLocaleString('en-US')} / ${window}`;
};

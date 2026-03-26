import { ModelSubscriptionRef } from '~/app/types/subscriptions';

export const formatTokenLimits = (modelRefs: ModelSubscriptionRef[], modelName: string): string => {
  const ref = modelRefs.find((r) => r.name === modelName);
  if (!ref || !ref.tokenRateLimits || ref.tokenRateLimits.length === 0) {
    return '—';
  }
  const { limit, window } = ref.tokenRateLimits[0];
  return `${limit.toLocaleString()} / ${window}`;
};

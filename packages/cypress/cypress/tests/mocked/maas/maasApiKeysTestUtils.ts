import type { APIKey, SubscriptionDetail } from '@odh-dashboard/maas/types/api-key';

export const mockSubscriptionDetails: Record<string, SubscriptionDetail> = {
  'premium-team-sub': {
    displayName: 'Premium Team',
    models: ['granite-3-8b-instruct', 'flan-t5-small'],
  },
  'basic-team-sub': { displayName: 'Basic Team', models: ['flan-t5-small'] },
};

export const mockSearchResponse = (
  keys: APIKey[],
  subscriptionDetails?: Record<string, SubscriptionDetail>,
): {
  data: {
    object: string;
    data: APIKey[];
    has_more: boolean;
    subscriptionDetails?: Record<string, SubscriptionDetail>;
  };
} => ({
  data: {
    object: 'list',
    data: keys,
    // eslint-disable-next-line camelcase
    has_more: false,
    subscriptionDetails,
  },
});

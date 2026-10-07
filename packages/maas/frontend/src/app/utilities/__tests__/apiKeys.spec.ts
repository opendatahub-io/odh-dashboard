/* eslint-disable camelcase */
import { isKeyInactive, subscriptionDetailsFromUserSubscriptions } from '~/app/utilities/apiKeys';
import type { APIKey } from '~/app/types/api-key';
import type { UserSubscription } from '~/app/types/subscriptions';

describe('subscriptionDetailsFromUserSubscriptions', () => {
  it('keys details by subscription_id_header', () => {
    const subs: UserSubscription[] = [
      {
        subscription_id_header: 'user-sub',
        subscription_description: 'desc',
        display_name: 'User Sub',
        priority: 0,
        model_refs: [{ name: 'm1', display_name: 'Model One' }],
      },
    ];

    expect(subscriptionDetailsFromUserSubscriptions(subs)).toEqual({
      'user-sub': { displayName: 'User Sub', models: ['Model One'] },
    });
  });
});

describe('isKeyInactive', () => {
  const activeKey: APIKey = {
    id: '1',
    name: 'k',
    creationDate: '2026-01-01',
    status: 'active',
    subscription: 'user-only-sub',
  };

  it('is false when details map is undefined', () => {
    expect(isKeyInactive(activeKey, undefined)).toBe(false);
  });

  it('is false when subscription exists in the BFF search map', () => {
    expect(
      isKeyInactive(activeKey, {
        'user-only-sub': { displayName: 'User Only', models: [] },
      }),
    ).toBe(false);
  });

  it('is true when active key subscription is missing from the map', () => {
    expect(isKeyInactive(activeKey, { 'other-sub': { displayName: 'Other', models: [] } })).toBe(
      true,
    );
  });
});

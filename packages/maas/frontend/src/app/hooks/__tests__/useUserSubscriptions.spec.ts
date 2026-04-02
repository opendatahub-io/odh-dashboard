/* eslint-disable camelcase */
import * as subscriptionsApi from '~/app/api/subscriptions';
import { testHook, standardUseFetchState } from '~/__tests__/unit/testUtils/hooks';
import { UserSubscription } from '~/app/types/subscriptions';
import { useUserSubscriptions } from '~/app/hooks/useUserSubscriptions';

jest.mock('~/app/api/subscriptions', () => ({
  ...jest.requireActual('~/app/api/subscriptions'),
  listUserSubscriptions: jest.fn(),
}));

const mockListUserSubscriptions = jest.mocked(subscriptionsApi.listUserSubscriptions);

const mockSubscriptionListItems: UserSubscription[] = [
  {
    subscription_id_header: 'premium-team-sub',
    subscription_description: 'Premium Team Subscription',
    display_name: 'Premium Team',
    priority: 10,
    cost_center: 'engineering',
    model_refs: [
      {
        name: 'granite-3-8b-instruct',
        namespace: 'maas-models',
        token_rate_limits: [{ limit: 100000, window: '24h' }],
      },
    ],
  },
  {
    subscription_id_header: 'basic-team-sub',
    subscription_description: 'Basic Team Subscription',
    priority: 1,
    model_refs: [
      {
        name: 'flan-t5-small',
        namespace: 'maas-models',
        token_rate_limits: [{ limit: 10000, window: '24h' }],
      },
    ],
  },
];

describe('useUserSubscriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array initial state before fetch resolves', () => {
    mockListUserSubscriptions.mockReturnValue(() => new Promise(jest.fn()));

    const renderResult = testHook(useUserSubscriptions)();

    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should return loaded subscription list on success', async () => {
    mockListUserSubscriptions.mockReturnValue(() => Promise.resolve(mockSubscriptionListItems));

    const renderResult = testHook(useUserSubscriptions)();

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState(mockSubscriptionListItems, true));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockListUserSubscriptions).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when no subscriptions are available', async () => {
    mockListUserSubscriptions.mockReturnValue(() => Promise.resolve([]));

    const renderResult = testHook(useUserSubscriptions)();

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState([], true));
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should return error state when fetch fails', async () => {
    const error = new Error('Network error');
    mockListUserSubscriptions.mockReturnValue(() => Promise.reject(error));

    const renderResult = testHook(useUserSubscriptions)();

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState([], false, error));
  });
});

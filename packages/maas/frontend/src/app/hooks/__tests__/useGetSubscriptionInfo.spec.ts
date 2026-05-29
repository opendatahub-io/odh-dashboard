import * as subscriptionsApi from '~/app/api/subscriptions';
import { testHook, standardUseFetchState } from '~/__tests__/unit/testUtils/hooks';
import { SubscriptionInfoResponse } from '~/app/types/subscriptions';
import { useGetSubscriptionInfo } from '~/app/hooks/useGetSubscriptionInfo';

jest.mock('~/app/api/subscriptions', () => ({
  ...jest.requireActual('~/app/api/subscriptions'),
  getSubscriptionInfo: jest.fn(),
}));

const mockGetSubscriptionInfo = jest.mocked(subscriptionsApi.getSubscriptionInfo);

const mockSubscriptionInfo: SubscriptionInfoResponse = {
  subscription: {
    name: 'premium-team-sub',
    namespace: 'maas-system',
    phase: 'Active',
    priority: 10,
    owner: {
      groups: [{ name: 'premium-users' }],
    },
    modelRefs: [
      {
        name: 'granite-3-8b-instruct',
        namespace: 'maas-models',
        tokenRateLimits: [{ limit: 100000, window: '24h' }],
      },
    ],
    creationTimestamp: '2025-03-01T10:00:00Z',
  },
  modelRefs: [
    {
      name: 'granite-3-8b-instruct',
      namespace: 'maas-models',
      modelRef: { kind: 'LLMInferenceService', name: 'granite-3-8b-instruct' },
      phase: 'Ready',
      endpoint: 'https://granite.example.com',
    },
  ],
  authPolicies: [
    {
      name: 'premium-team-sub-policy',
      namespace: 'maas-system',
      phase: 'Active',
      modelRefs: [{ name: 'granite-3-8b-instruct', namespace: 'maas-models' }],
      subjects: { groups: [{ name: 'premium-users' }] },
    },
  ],
};

describe('useGetSubscriptionInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null initial state before fetch resolves', () => {
    mockGetSubscriptionInfo.mockReturnValue(() => new Promise(jest.fn()));

    const renderResult = testHook(useGetSubscriptionInfo)('premium-team-sub');

    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should return loaded subscription info on success', async () => {
    mockGetSubscriptionInfo.mockReturnValue(() => Promise.resolve(mockSubscriptionInfo));

    const renderResult = testHook(useGetSubscriptionInfo)('premium-team-sub');

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState(mockSubscriptionInfo, true));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetSubscriptionInfo).toHaveBeenCalledWith('premium-team-sub');
  });

  it('should return error state when fetch fails', async () => {
    const error = new Error('Network error');
    mockGetSubscriptionInfo.mockReturnValue(() => Promise.reject(error));

    const renderResult = testHook(useGetSubscriptionInfo)('premium-team-sub');

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, false, error));
  });

  it('should re-fetch when subscription name changes', async () => {
    mockGetSubscriptionInfo.mockReturnValue(() => Promise.resolve(mockSubscriptionInfo));

    const renderResult = testHook(useGetSubscriptionInfo)('premium-team-sub');
    await renderResult.waitForNextUpdate();

    expect(mockGetSubscriptionInfo).toHaveBeenCalledWith('premium-team-sub');
    expect(mockGetSubscriptionInfo).toHaveBeenCalledTimes(1);

    const basicInfo: SubscriptionInfoResponse = {
      ...mockSubscriptionInfo,
      subscription: { ...mockSubscriptionInfo.subscription, name: 'basic-team-sub' },
    };
    mockGetSubscriptionInfo.mockReturnValue(() => Promise.resolve(basicInfo));

    renderResult.rerender('basic-team-sub');
    await renderResult.waitForNextUpdate();

    expect(mockGetSubscriptionInfo).toHaveBeenCalledWith('basic-team-sub');
    expect(mockGetSubscriptionInfo).toHaveBeenCalledTimes(2);
  });
});

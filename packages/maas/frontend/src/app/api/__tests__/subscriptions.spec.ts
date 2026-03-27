import * as modArchCore from 'mod-arch-core';
import { SubscriptionInfoResponse } from '~/app/types/subscriptions';
import { getSubscriptionInfo, listSubscriptions } from '~/app/api/subscriptions';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  handleRestFailures: jest.fn((p: Promise<unknown>) => p),
  restGET: jest.fn(),
}));

const mockRestGET = jest.mocked(modArchCore.restGET);
const mockHandleRestFailures = jest.mocked(modArchCore.handleRestFailures);

const validSubscriptionInfoResponse: SubscriptionInfoResponse = {
  subscription: {
    name: 'test-sub',
    namespace: 'maas-system',
    phase: 'Active',
    owner: { groups: [{ name: 'test-group' }] },
    modelRefs: [
      {
        name: 'test-model',
        namespace: 'maas-models',
        tokenRateLimits: [{ limit: 50000, window: '24h' }],
      },
    ],
    creationTimestamp: '2025-01-01T00:00:00Z',
  },
  modelRefs: [
    {
      name: 'test-model',
      namespace: 'maas-models',
      modelRef: { kind: 'LLMInferenceService', name: 'test-model' },
      phase: 'Ready',
    },
  ],
  authPolicies: [
    {
      name: 'test-policy',
      namespace: 'maas-system',
      modelRefs: [{ name: 'test-model', namespace: 'maas-models' }],
      subjects: { groups: [{ name: 'test-group' }] },
    },
  ],
};

describe('getSubscriptionInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p: Promise<unknown>) => p);
  });

  it('should resolve with subscription info for a valid response', async () => {
    mockRestGET.mockResolvedValue(validSubscriptionInfoResponse);

    const result = await getSubscriptionInfo('test-sub')({} as never);
    expect(result).toStrictEqual(validSubscriptionInfoResponse);
    expect(mockRestGET).toHaveBeenCalledWith(
      '',
      expect.stringContaining('/subscription-info/test-sub'),
      {},
      {},
    );
  });

  it('should throw for a response missing required subscription fields', async () => {
    const invalid = { ...validSubscriptionInfoResponse, subscription: null };
    mockRestGET.mockResolvedValue(invalid);

    await expect(getSubscriptionInfo('test-sub')({} as never)).rejects.toThrow(
      'Invalid response format',
    );
  });

  it('should throw for a response with missing modelRefs array', async () => {
    const invalid = { ...validSubscriptionInfoResponse, modelRefs: 'not-an-array' };
    mockRestGET.mockResolvedValue(invalid);

    await expect(getSubscriptionInfo('test-sub')({} as never)).rejects.toThrow(
      'Invalid response format',
    );
  });

  it('should throw for a response with missing authPolicies array', async () => {
    const invalid = { ...validSubscriptionInfoResponse, authPolicies: undefined };
    mockRestGET.mockResolvedValue(invalid);

    await expect(getSubscriptionInfo('test-sub')({} as never)).rejects.toThrow(
      'Invalid response format',
    );
  });

  it('should accept an empty authPolicies array', async () => {
    const emptyPolicies = { ...validSubscriptionInfoResponse, authPolicies: [] };
    mockRestGET.mockResolvedValue(emptyPolicies);

    const result = await getSubscriptionInfo('test-sub')({} as never);
    expect(result.authPolicies).toHaveLength(0);
  });

  it('should accept subscription.modelRefs without tokenRateLimits (real API case)', async () => {
    const noTokenLimits: SubscriptionInfoResponse = {
      ...validSubscriptionInfoResponse,
      subscription: {
        ...validSubscriptionInfoResponse.subscription,
        modelRefs: [{ name: 'test-model', namespace: 'maas-models' }],
      },
    };
    mockRestGET.mockResolvedValue(noTokenLimits);

    const result = await getSubscriptionInfo('test-sub')({} as never);
    expect(result.subscription.modelRefs[0].tokenRateLimits).toBeUndefined();
  });

  it('should accept displayName and description on subscription when present', async () => {
    const withAnnotations: SubscriptionInfoResponse = {
      ...validSubscriptionInfoResponse,
      subscription: {
        ...validSubscriptionInfoResponse.subscription,
        displayName: 'Premium Team Subscription',
        description: 'High-priority subscription for the premium team.',
      },
    };
    mockRestGET.mockResolvedValue(withAnnotations);

    const result = await getSubscriptionInfo('test-sub')({} as never);
    expect(result.subscription.displayName).toBe('Premium Team Subscription');
    expect(result.subscription.description).toBe(
      'High-priority subscription for the premium team.',
    );
  });

  it('should accept optional fields (phase, endpoint) being absent on modelRefs', async () => {
    const noOptionals: SubscriptionInfoResponse = {
      ...validSubscriptionInfoResponse,
      modelRefs: [
        {
          name: 'test-model',
          namespace: 'maas-models',
          modelRef: { kind: 'LLMInferenceService', name: 'test-model' },
        },
      ],
    };
    mockRestGET.mockResolvedValue(noOptionals);

    const result = await getSubscriptionInfo('test-sub')({} as never);
    expect(result.modelRefs[0].phase).toBeUndefined();
    expect(result.modelRefs[0].endpoint).toBeUndefined();
  });
});

describe('listSubscriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p: Promise<unknown>) => p);
  });

  it('should resolve with subscription array for a valid wrapped response', async () => {
    const subscriptions = [validSubscriptionInfoResponse.subscription];
    mockRestGET.mockResolvedValue({ data: subscriptions });

    const result = await listSubscriptions()({} as never);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('test-sub');
  });

  it('should throw for an unwrapped (non-data) response', async () => {
    mockRestGET.mockResolvedValue([validSubscriptionInfoResponse.subscription]);

    await expect(listSubscriptions()({} as never)).rejects.toThrow('Invalid response format');
  });
});

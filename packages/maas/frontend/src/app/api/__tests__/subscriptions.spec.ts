/* eslint-disable camelcase */
import * as modArchCore from 'mod-arch-core';
import {
  CreateSubscriptionResponse,
  SubscriptionInfoResponse,
  UserSubscription,
} from '~/app/types/subscriptions';
import {
  getSubscriptionInfo,
  listSubscriptions,
  listUserSubscriptions,
  updateSubscription,
} from '~/app/api/subscriptions';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  handleRestFailures: jest.fn((p: Promise<unknown>) => p),
  restGET: jest.fn(),
  restUPDATE: jest.fn(),
}));

const mockRestGET = jest.mocked(modArchCore.restGET);
const mockRestUPDATE = jest.mocked(modArchCore.restUPDATE);
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

  it('should reject subscription.modelRefs without tokenRateLimits', async () => {
    const noTokenLimits = {
      ...validSubscriptionInfoResponse,
      subscription: {
        ...validSubscriptionInfoResponse.subscription,
        modelRefs: [{ name: 'test-model', namespace: 'maas-models' }],
      },
    };
    mockRestGET.mockResolvedValue(noTokenLimits);

    await expect(getSubscriptionInfo('test-sub')({} as never)).rejects.toThrow(
      'Invalid response format',
    );
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

describe('listUserSubscriptions', () => {
  const validItem: UserSubscription = {
    subscription_id_header: 'premium-team-sub',
    subscription_description: 'Premium Team Subscription',
    priority: 10,
    model_refs: [
      {
        name: 'granite-3-8b-instruct',
        namespace: 'maas-models',
        token_rate_limits: [{ limit: 100000, window: '24h' }],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p: Promise<unknown>) => p);
  });

  it('should resolve with subscription list for a valid response', async () => {
    mockRestGET.mockResolvedValue({ data: [validItem] });

    const result = await listUserSubscriptions()({} as never);
    expect(result).toHaveLength(1);
    expect(result[0].subscription_id_header).toBe('premium-team-sub');
  });

  it('should resolve with an empty array when the list is empty', async () => {
    mockRestGET.mockResolvedValue({ data: [] });

    const result = await listUserSubscriptions()({} as never);
    expect(result).toHaveLength(0);
  });

  it('should accept items without optional fields (namespace, token_rate_limits, cost_center)', async () => {
    const minimal: UserSubscription = {
      subscription_id_header: 'basic-sub',
      subscription_description: 'Basic',
      priority: 1,
      model_refs: [{ name: 'flan-t5-small' }],
    };
    mockRestGET.mockResolvedValue({ data: [minimal] });

    const result = await listUserSubscriptions()({} as never);
    expect(result[0].model_refs[0].namespace).toBeUndefined();
    expect(result[0].model_refs[0].token_rate_limits).toBeUndefined();
  });

  it('should throw for an unwrapped (non-data) response', async () => {
    mockRestGET.mockResolvedValue([validItem]);

    await expect(listUserSubscriptions()({} as never)).rejects.toThrow('Invalid response format');
  });

  it('should throw when subscription_id_header is missing', async () => {
    const invalid = [{ subscription_description: 'desc', priority: 1, model_refs: [] }];
    mockRestGET.mockResolvedValue({ data: invalid });

    await expect(listUserSubscriptions()({} as never)).rejects.toThrow('Invalid response format');
  });

  it('should throw when priority is not a number', async () => {
    const invalid = [{ ...validItem, priority: '10' }];
    mockRestGET.mockResolvedValue({ data: invalid });

    await expect(listUserSubscriptions()({} as never)).rejects.toThrow('Invalid response format');
  });

  it('should throw when model_refs contains an item with an invalid token_rate_limit entry', async () => {
    const invalid = [
      {
        ...validItem,
        model_refs: [
          { name: 'model', token_rate_limits: [{ limit: 'not-a-number', window: '24h' }] },
        ],
      },
    ];
    mockRestGET.mockResolvedValue({ data: invalid });

    await expect(listUserSubscriptions()({} as never)).rejects.toThrow('Invalid response format');
  });
});

describe('updateSubscription', () => {
  const validUpdateResponse: CreateSubscriptionResponse = {
    subscription: {
      name: 'test-sub',
      namespace: 'maas-system',
      owner: { groups: [{ name: 'updated-group' }] },
      modelRefs: [
        {
          name: 'test-model',
          namespace: 'maas-models',
          tokenRateLimits: [{ limit: 200000, window: '24h' }],
        },
      ],
      priority: 5,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((p: Promise<unknown>) => p);
  });

  it('should resolve with updated subscription for a valid response', async () => {
    mockRestUPDATE.mockResolvedValue({ data: validUpdateResponse });

    const result = await updateSubscription()({} as never, 'test-sub', {
      owner: { groups: [{ name: 'updated-group' }] },
      modelRefs: [
        {
          name: 'test-model',
          namespace: 'maas-models',
          tokenRateLimits: [{ limit: 200000, window: '24h' }],
        },
      ],
      priority: 5,
    });
    expect(result.subscription.name).toBe('test-sub');
    expect(result.subscription.owner.groups[0].name).toBe('updated-group');
    expect(mockRestUPDATE).toHaveBeenCalledWith(
      '',
      expect.stringContaining('/update-subscription/test-sub'),
      expect.any(Object),
      {},
      {},
    );
  });

  it('should encode the subscription name in the URL', async () => {
    mockRestUPDATE.mockResolvedValue({ data: validUpdateResponse });

    await updateSubscription()({} as never, 'sub with spaces', {
      owner: { groups: [] },
      modelRefs: [],
      priority: 0,
    });

    expect(mockRestUPDATE).toHaveBeenCalledWith(
      '',
      expect.stringContaining('/update-subscription/sub%20with%20spaces'),
      expect.any(Object),
      {},
      {},
    );
  });

  it('should throw for an invalid response format', async () => {
    mockRestUPDATE.mockResolvedValue({ data: { invalid: true } });

    await expect(
      updateSubscription()({} as never, 'test-sub', {
        owner: { groups: [] },
        modelRefs: [],
        priority: 0,
      }),
    ).rejects.toThrow('Invalid response format');
  });

  it('should normalize null tokenRateLimits to empty arrays', async () => {
    const responseWithNull: CreateSubscriptionResponse = {
      subscription: {
        ...validUpdateResponse.subscription,
        modelRefs: [
          {
            name: 'model',
            namespace: 'ns',
            tokenRateLimits: null as unknown as [],
          },
        ],
      },
    };
    mockRestUPDATE.mockResolvedValue({ data: responseWithNull });

    const result = await updateSubscription()({} as never, 'test-sub', {
      owner: { groups: [] },
      modelRefs: [],
      priority: 0,
    });

    expect(result.subscription.modelRefs[0].tokenRateLimits).toEqual([]);
  });
});

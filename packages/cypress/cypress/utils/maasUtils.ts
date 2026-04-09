import type {
  APIKey,
  CreateAPIKeyResponse,
  CreateAPIKeyRequest,
} from '@odh-dashboard/maas/types/api-key';
import type { PolicyInfoResponse } from '@odh-dashboard/maas/types/auth-policies';
import type {
  MaaSSubscription,
  SubscriptionInfoResponse,
  UserSubscription,
  MaaSModelRefSummary,
  SubscriptionPolicyFormDataResponse,
  CreateSubscriptionResponse,
  MaaSAuthPolicy,
} from '@odh-dashboard/maas/types/subscriptions';

export const mockAPIKeys = (): APIKey[] => [
  {
    id: 'key-prod-backend-001',
    name: 'production-backend',
    description: 'Production API key for backend service',
    creationDate: '2026-01-07T11:54:34.521671447-05:00',
    expirationDate: '2026-02-06T11:54:34.521671447-05:00',
    status: 'active',
    username: 'alice',
    lastUsedAt: '2026-03-10T14:30:00Z',
    subscription: 'premium-team-sub',
  },
  {
    id: 'key-dev-testing-002',
    name: 'development-testing',
    description: 'Development API key for testing purposes',
    creationDate: '2026-01-14T09:54:34.521671447-05:00',
    expirationDate: '2026-01-15T09:54:34.521671447-05:00',
    status: 'active',
    username: 'bob',
    lastUsedAt: '2026-03-09T10:15:00Z',
    subscription: 'basic-team-sub',
  },
  {
    id: 'key-ci-pipeline-003',
    name: 'ci-pipeline',
    description: 'API key for CI/CD pipeline automation',
    creationDate: '2026-01-11T11:54:34.521671447-05:00',
    expirationDate: '2026-01-18T11:54:34.521671447-05:00',
    status: 'revoked',
    username: 'carol',
    subscription: 'premium-team-sub',
  },
  {
    id: 'key-expired-old-004',
    name: 'old-service-key',
    description: 'Expired API key from previous deployment',
    creationDate: '2025-12-15T11:54:34.521671447-05:00',
    expirationDate: '2026-01-13T11:54:34.521671447-05:00',
    status: 'expired',
    username: 'dave',
  },
];

export const mockCreateAPIKeyResponse = (): CreateAPIKeyResponse => {
  return {
    key: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJtYWFzLWFwaSIsInN1YiI6InRlc3QtdXNlciIsImF1ZCI6WyJtYWFzLWFwaSJdLCJleHAiOjE2NzI1NDU2MDAsIm5iZiI6MTY3MjUzMTIwMCwiaWF0IjoxNjcyNTMxMjAwfQ.mock-signature',
    keyPrefix: 'sk-oai-abc',
    id: 'key-prod-backend-001',
    expiresAt: '2026-01-20T11:54:34.521671447-05:00',
    name: 'production-backend',
    createdAt: '2026-01-14T11:54:34.521671447-05:00',
  };
};

export const mockCreateAPIKeyRequest = (): CreateAPIKeyRequest => {
  return {
    name: 'production-backend',
    description: 'Production API key for backend service',
    expiresIn: '168h', // 7 days in hours
    subscription: 'premium-team-sub',
  };
};

export const mockFailedSubscription = (): MaaSSubscription => ({
  name: 'failed-sub',
  namespace: 'maas-system',
  phase: 'Failed',
  statusMessage:
    'failed to reconcile TokenRateLimitPolicies: token rate limit exceeds maximum allowed value',
  priority: 99,
  owner: {
    groups: [{ name: 'system:authenticated' }],
  },
  modelRefs: [
    {
      name: 'granite-3-8b-instruct',
      namespace: 'maas-models',
      tokenRateLimits: [{ limit: 9999999, window: '24h' }],
    },
  ],
  creationTimestamp: '2025-04-01T12:00:00Z',
});

export const mockPendingSubscription = (): MaaSSubscription => ({
  name: 'pending-sub',
  namespace: 'maas-system',
  phase: 'Pending',
  statusMessage: '',
  priority: 99,
  owner: {
    groups: [{ name: 'beta-testers' }],
  },
  modelRefs: [
    {
      name: 'flan-t5-small',
      namespace: 'maas-models',
      tokenRateLimits: [{ limit: 5000, window: '1h' }],
    },
  ],
  creationTimestamp: '2025-04-05T09:00:00Z',
});

export const mockSubscriptions = (): MaaSSubscription[] => [
  {
    name: 'premium-team-sub',
    displayName: 'Premium Team Subscription',
    namespace: 'maas-system',
    phase: 'Active',
    statusMessage: 'successfully reconciled',
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
      {
        name: 'flan-t5-small',
        namespace: 'maas-models',
        tokenRateLimits: [{ limit: 200000, window: '24h' }],
      },
    ],
    tokenMetadata: {
      organizationId: 'org-123',
      costCenter: 'engineering',
    },
    creationTimestamp: '2025-03-01T10:00:00Z',
  },
  {
    name: 'basic-team-sub',
    displayName: 'Basic Team Subscription',
    namespace: 'maas-system',
    phase: 'Active',
    statusMessage: 'successfully reconciled',
    owner: {
      groups: [{ name: 'system:authenticated' }],
    },
    modelRefs: [
      {
        name: 'flan-t5-small',
        namespace: 'maas-models',
        tokenRateLimits: [{ limit: 10000, window: '24h' }],
      },
    ],
    priority: 0,
    creationTimestamp: '2025-02-15T08:00:00Z',
  },
  {
    name: 'negative-priority-sub',
    namespace: 'maas-system',
    phase: 'Active',
    statusMessage: 'successfully reconciled',
    priority: -10000,
    owner: {
      groups: [{ name: 'system:authenticated' }],
    },
    modelRefs: [
      {
        name: 'flan-t5-small',
        namespace: 'maas-models',
        tokenRateLimits: [{ limit: 10000, window: '24h' }],
      },
    ],
    creationTimestamp: '2025-03-18T03:00:00Z',
  },
  mockFailedSubscription(),
  mockPendingSubscription(),
];

export const mockSubscriptionListItems = (): UserSubscription[] => [
  {
    // eslint-disable-next-line camelcase
    subscription_id_header: 'premium-team-sub',
    // eslint-disable-next-line camelcase
    subscription_description: 'Premium Team Subscription',
    // eslint-disable-next-line camelcase
    display_name: 'Premium Team',
    priority: 10,
    // eslint-disable-next-line camelcase
    cost_center: 'engineering',
    // eslint-disable-next-line camelcase
    organization_id: 'org-123',
    // eslint-disable-next-line camelcase
    model_refs: [
      {
        name: 'granite-3-8b-instruct',
        namespace: 'maas-models',
        // eslint-disable-next-line camelcase
        token_rate_limits: [{ limit: 100000, window: '24h' }],
      },
      {
        name: 'flan-t5-small',
        namespace: 'maas-models',
        // eslint-disable-next-line camelcase
        token_rate_limits: [{ limit: 200000, window: '24h' }],
      },
    ],
  },
  {
    // eslint-disable-next-line camelcase
    subscription_id_header: 'basic-team-sub',
    // eslint-disable-next-line camelcase
    subscription_description: 'Basic Team Subscription',
    // eslint-disable-next-line camelcase
    display_name: 'Basic Team',
    priority: 1,
    // eslint-disable-next-line camelcase
    model_refs: [
      {
        name: 'flan-t5-small',
        namespace: 'maas-models',
        // eslint-disable-next-line camelcase
        token_rate_limits: [{ limit: 10000, window: '24h' }],
      },
    ],
  },
];

export const mockSubscriptionInfo = (name = 'premium-team-sub'): SubscriptionInfoResponse => {
  const subscription = mockSubscriptions().find((s) => s.name === name) ?? mockSubscriptions()[0];
  return {
    subscription,
    modelRefs: subscription.modelRefs.map((ref) => ({
      name: ref.name,
      namespace: ref.namespace,
      displayName: `${ref.name} Display`,
      modelRef: { kind: 'LLMInferenceService', name: ref.name },
      phase: 'Ready',
      endpoint: `https://${ref.name}.example.com`,
    })),
    authPolicies: [
      {
        name: `${name}-policy`,
        namespace: subscription.namespace,
        phase: 'Active',
        statusMessage: 'successfully reconciled',
        modelRefs: subscription.modelRefs.map((ref) => ({
          name: ref.name,
          namespace: ref.namespace,
        })),
        subjects: {
          groups: subscription.owner.groups,
        },
      },
    ],
  };
};
export const mockModelRefSummaries = (): MaaSModelRefSummary[] => [
  {
    name: 'granite-3-8b-instruct',
    namespace: 'maas-models',
    displayName: 'Granite 3 8B Instruct',
    description: 'A large language model for instruction following',
    modelRef: { kind: 'InferenceService', name: 'granite-3-8b-instruct' },
    phase: 'Ready',
    endpoint: 'https://granite-3-8b-instruct.maas-models.svc.cluster.local',
  },
  {
    name: 'flan-t5-small',
    namespace: 'maas-models',
    displayName: 'Flan T5 Small',
    description: 'A compact text-to-text model',
    modelRef: { kind: 'InferenceService', name: 'flan-t5-small' },
    phase: 'Ready',
    endpoint: 'https://flan-t5-small.maas-models.svc.cluster.local',
  },
];

export const mockSubscriptionFormData = (): SubscriptionPolicyFormDataResponse => ({
  groups: ['system:authenticated', 'premium-users', 'enterprise-users', 'beta-testers'],
  modelRefs: mockModelRefSummaries(),
  subscriptions: mockSubscriptions(),
  policies: mockAuthPolicies(),
});

export const mockCreateSubscriptionResponse = (): CreateSubscriptionResponse => ({
  subscription: {
    name: 'test-subscription',
    displayName: 'Test Subscription',
    description: 'A test subscription',
    namespace: 'maas-system',
    phase: 'Active',
    statusMessage: 'successfully reconciled',
    priority: 5,
    owner: {
      groups: [{ name: 'premium-users' }, { name: 'my-custom-group' }],
    },
    modelRefs: [
      {
        name: 'granite-3-8b-instruct',
        namespace: 'maas-models',
        tokenRateLimits: [{ limit: 5000, window: '1h' }],
      },
    ],
    creationTimestamp: '2025-03-20T10:00:00Z',
  },
  authPolicy: {
    name: 'test-subscription-policy',
    namespace: 'maas-system',
    phase: 'Active',
    statusMessage: 'successfully reconciled',
    modelRefs: [{ name: 'granite-3-8b-instruct', namespace: 'maas-models' }],
    subjects: { groups: [{ name: 'premium-users' }, { name: 'my-custom-group' }] },
  },
});

export const mockUpdateSubscriptionResponse = (
  name = 'basic-team-sub',
): CreateSubscriptionResponse => {
  const subscription = mockSubscriptions().find((s) => s.name === name) ?? mockSubscriptions()[1];
  return { subscription };
};

export const mockCreatePolicyResponse = (name = 'new-policy-from-test'): MaaSAuthPolicy => ({
  name,
  namespace: 'maas-system',
  phase: 'Pending',
  statusMessage: '',
  modelRefs: [{ name: 'granite-3-8b-instruct', namespace: 'maas-models' }],
  subjects: { groups: [{ name: 'premium-users' }] },
});

export const mockFailedAuthPolicy = (): MaaSAuthPolicy => ({
  name: 'failed-policy',
  namespace: 'maas-system',
  phase: 'Failed',
  statusMessage: 'all 2 model references are invalid or missing',
  modelRefs: [{ name: 'granite-3-8b-instruct', namespace: 'maas-models' }],
  subjects: { groups: [{ name: 'system:authenticated' }] },
});

export const mockPendingAuthPolicy = (): MaaSAuthPolicy => ({
  name: 'pending-policy',
  namespace: 'maas-system',
  phase: 'Pending',
  statusMessage: '',
  modelRefs: [{ name: 'flan-t5-small', namespace: 'maas-models' }],
  subjects: { groups: [{ name: 'beta-testers' }] },
});

export const mockAuthPolicies = (): MaaSAuthPolicy[] => [
  {
    name: 'test-subscription-policy',
    namespace: 'maas-system',
    phase: 'Active',
    statusMessage: 'successfully reconciled',
    modelRefs: [{ name: 'granite-3-8b-instruct', namespace: 'maas-models' }],
    subjects: { groups: [{ name: 'premium-users' }, { name: 'my-custom-group' }] },
  },
  {
    name: 'premium-team-policy',
    namespace: 'maas-system',
    phase: 'Active',
    statusMessage: 'successfully reconciled',
    modelRefs: mockSubscriptions()[0].modelRefs,
    subjects: {
      groups: mockSubscriptions()[0].owner.groups,
    },
  },
  {
    name: 'basic-team-policy',
    namespace: 'maas-system',
    phase: 'Active',
    statusMessage: 'successfully reconciled',
    modelRefs: mockSubscriptions()[1].modelRefs,
    subjects: {
      groups: mockSubscriptions()[1].owner.groups,
    },
  },
  mockFailedAuthPolicy(),
  mockPendingAuthPolicy(),
];

export const mockPolicyInfo = (name = 'premium-team-policy'): PolicyInfoResponse => {
  const policy = mockAuthPolicies().find((p) => p.name === name) ?? mockAuthPolicies()[0];
  const resolvedName = policy.name;
  return {
    policy: {
      ...policy,
      displayName: `${resolvedName} Display`,
      description: `Description for ${resolvedName}`,
      creationTimestamp: '2025-03-01T10:00:00Z',
    },
    modelRefs: policy.modelRefs.map((ref) => ({
      name: ref.name,
      namespace: ref.namespace,
      displayName: `${ref.name} Display`,
      description: `Description for ${ref.name}`,
      modelRef: { kind: 'LLMInferenceService', name: ref.name },
      phase: 'Ready' as const,
      endpoint: `https://${ref.name}.example.com`,
    })),
  };
};

import type {
  APIKey,
  CreateAPIKeyResponse,
  CreateAPIKeyRequest,
} from '@odh-dashboard/maas/types/api-key';
import type { PolicyInfoResponse } from '@odh-dashboard/maas/types/auth-policies';
import type { ExternalModel } from '@odh-dashboard/maas/types/external-models';
import type {
  MaaSSubscription,
  ModelOverviewItem,
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
    subscription: 'premium-team-sub',
  },
];

export const mockCreateAPIKeyResponse = (): CreateAPIKeyResponse => {
  return {
    key: 'sk-oai-1JO088RHrhLvlwNqT_LDEQgy7IbnbyoSYQCjuMqLpzRI8xns9gBFo0bZsaSat',
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

export const mockDeletingSubscription = (): MaaSSubscription => ({
  name: 'deleting-sub',
  namespace: 'maas-system',
  phase: 'Active',
  statusMessage: 'successfully reconciled',
  priority: 55,
  owner: {
    groups: [{ name: 'premium-users' }],
  },
  modelRefs: [
    {
      name: 'granite-3-8b-instruct',
      namespace: 'maas-models',
      tokenRateLimits: [{ limit: 50000, window: '24h' }],
    },
  ],
  creationTimestamp: '2025-04-06T12:00:00Z',
  deletionTimestamp: '2025-04-07T12:00:00Z',
});

export const mockSubscriptions = (): MaaSSubscription[] => [
  {
    name: 'premium-team-sub',
    displayName: 'Premium Team Subscription',
    description: 'Access to premium AI models for enterprise teams',
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
        displayName: 'Granite 3 8B Instruct',
        description:
          'Granite 3 8B Instruct is a large language model that is used for advanced tasks.',
        tokenRateLimits: [{ limit: 100000, window: '24h' }],
      },
      {
        name: 'flan-t5-small',
        namespace: 'maas-models',
        displayName: 'Flan T5 Small',
        description: 'Flan T5 Small is a small language model that is used for basic tasks.',
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
    description: 'Standard access for general users',
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
        displayName: 'Flan T5 Small',
        description: 'Flan T5 Small is a small language model that is used for basic tasks.',
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
        displayName: 'Flan T5 Small',
        description: 'Flan T5 Small is a small language model that is used for basic tasks.',
        tokenRateLimits: [{ limit: 10000, window: '24h' }],
      },
    ],
    creationTimestamp: '2025-03-18T03:00:00Z',
  },
  {
    name: 'multi-group-llama-sub',
    displayName: 'Enterprise Multi-Group Llama Access',
    description: 'Broad access to Llama 3 70B for multiple teams across the organization',
    namespace: 'maas-system',
    phase: 'Active',
    statusMessage: 'successfully reconciled',
    priority: 5,
    owner: {
      groups: [
        { name: 'platform-admins' },
        { name: 'data-science-team' },
        { name: 'ml-engineers' },
        { name: 'analytics-team' },
        { name: 'qa-engineers' },
        { name: 'devops-team' },
        { name: 'security-reviewers' },
        { name: 'product-managers' },
        { name: 'research-team' },
        { name: 'frontend-devs' },
        { name: 'backend-devs' },
        { name: 'interns' },
      ],
    },
    modelRefs: [
      {
        name: 'llama-3-70b-instruct',
        namespace: 'maas-models',
        tokenRateLimits: [
          { limit: 2000, window: '1m' },
          { limit: 80000, window: '1h' },
          { limit: 600000, window: '24h' },
        ],
      },
    ],
    creationTimestamp: '2025-04-01T09:00:00Z',
  },
  mockFailedSubscription(),
  mockPendingSubscription(),
  mockDeletingSubscription(),
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
    key_count: 10,
    // eslint-disable-next-line camelcase
    cost_center: 'engineering',
    // eslint-disable-next-line camelcase
    organization_id: 'org-123',
    // eslint-disable-next-line camelcase
    model_refs: [
      {
        name: 'granite-3-8b-instruct',
        // eslint-disable-next-line camelcase
        display_name: 'Granite 3 8B Instruct',
        source: 'Internal',
        namespace: 'maas-models',
        description:
          'Granite 3 8B Instruct is a large language model that is used for advanced tasks.',
        // eslint-disable-next-line camelcase
        token_rate_limits: [{ limit: 100000, window: '24h' }],
      },
      {
        name: 'flan-t5-small',
        // eslint-disable-next-line camelcase
        display_name: 'Flan T5 Small',
        source: 'External',
        namespace: 'maas-models',
        description: 'Flan T5 Small is a small language model that is used for basic tasks.',
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
    key_count: 5,
    // eslint-disable-next-line camelcase
    model_refs: [
      {
        name: 'flan-t5-small',
        // eslint-disable-next-line camelcase
        display_name: 'Flan T5 Small',
        source: 'External',
        namespace: 'maas-models',
        description: 'Flan T5 Small is a small language model that is used for basic tasks.',
        // eslint-disable-next-line camelcase
        token_rate_limits: [{ limit: 10000, window: '24h' }],
      },
    ],
  },
];

export const mockSubscriptionInfoMissingModelSummaries = (): SubscriptionInfoResponse => {
  const subscription: MaaSSubscription = {
    name: 'missing-model-summary-sub',
    displayName: "Subscription with model refs that don't exist",
    namespace: 'maas-system',
    phase: 'Active',
    statusMessage: 'successfully reconciled',
    priority: 7,
    owner: {
      groups: [{ name: 'premium-users' }],
    },
    modelRefs: [
      {
        name: 'deleted-model-ref',
        namespace: 'maas-models',
        tokenRateLimits: [{ limit: 50000, window: '24h' }],
      },
    ],
    creationTimestamp: '2025-03-01T10:00:00Z',
  };

  return {
    subscription,
    modelRefs: [],
    authPolicies: [],
  };
};

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
    description: 'Granite 3 8B Instruct is a large language model that is used for advanced tasks.',
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
  {
    name: 'llama-3-70b-instruct',
    namespace: 'maas-models',
    displayName: 'Llama 3 70B Instruct',
    description: 'A large open-weight model for complex reasoning and multi-turn dialogue',
    modelRef: { kind: 'InferenceService', name: 'llama-3-70b-instruct' },
    phase: 'Ready',
    endpoint: 'https://llama-3-70b-instruct.maas-models.svc.cluster.local',
  },
  {
    name: 'gemma-7b-it',
    namespace: 'maas-models',
    displayName: 'Gemma 7B IT',
    description: 'Google Gemma 7B instruction-tuned model for general-purpose tasks',
    modelRef: { kind: 'InferenceService', name: 'gemma-7b-it' },
    phase: 'Ready',
    endpoint: 'https://gemma-7b-it.maas-models.svc.cluster.local',
  },
];

export const mockSubscriptionFormData = (
  overrides?: Partial<SubscriptionPolicyFormDataResponse>,
): SubscriptionPolicyFormDataResponse => ({
  groups: [
    'system:authenticated',
    'premium-users',
    'enterprise-users',
    'beta-testers',
    'platform-admins',
    'data-science-team',
    'ml-engineers',
    'analytics-team',
    'qa-engineers',
    'devops-team',
    'security-reviewers',
    'product-managers',
    'research-team',
    'frontend-devs',
    'backend-devs',
    'interns',
  ],
  modelRefs: mockModelRefSummaries(),
  subscriptions: mockSubscriptions(),
  policies: mockAuthPolicies(),
  ...overrides,
});

export const mockModelsOverview = (): ModelOverviewItem[] => [
  {
    id: 'granite-3-8b-instruct',
    modelDetails: {
      displayName: 'Granite 3 8B Instruct',
      description: 'A large language model for instruction following',
      phase: 'Ready',
    },
    subscriptions: [
      {
        name: 'premium-team-sub',
        displayName: 'Premium Team Subscription',
        phase: 'Active',
        groups: ['premium-users'],
        tokenRateLimits: [{ limit: 100000, window: '24h' }],
      },
      {
        name: 'failed-sub',
        phase: 'Failed',
        groups: ['system:authenticated'],
        tokenRateLimits: [{ limit: 9999999, window: '24h' }],
      },
      {
        name: 'deleting-sub',
        phase: 'Active',
        groups: ['premium-users'],
        tokenRateLimits: [{ limit: 50000, window: '24h' }],
      },
    ],
    authPolicies: [
      {
        name: 'test-subscription-policy',
        phase: 'Active',
        groups: ['premium-users', 'my-custom-group'],
      },
      {
        name: 'premium-team-policy',
        displayName: 'Premium Team Policy',
        phase: 'Active',
        groups: ['premium-users'],
      },
      { name: 'failed-policy', phase: 'Failed', groups: ['system:authenticated'] },
      { name: 'deleting-policy', phase: 'Active', groups: ['premium-users'] },
    ],
  },
  {
    id: 'flan-t5-small',
    modelDetails: {
      displayName: 'Flan T5 Small',
      description: 'A compact text-to-text model',
      phase: 'Ready',
    },
    subscriptions: [
      {
        name: 'premium-team-sub',
        displayName: 'Premium Team Subscription',
        phase: 'Active',
        groups: ['premium-users'],
        tokenRateLimits: [{ limit: 200000, window: '24h' }],
      },
      {
        name: 'basic-team-sub',
        displayName: 'Basic Team Subscription',
        phase: 'Active',
        groups: ['system:authenticated'],
        tokenRateLimits: [{ limit: 10000, window: '24h' }],
      },
      {
        name: 'negative-priority-sub',
        phase: 'Active',
        groups: ['system:authenticated'],
        tokenRateLimits: [{ limit: 10000, window: '24h' }],
      },
      {
        name: 'pending-sub',
        phase: 'Pending',
        groups: ['beta-testers'],
        tokenRateLimits: [{ limit: 5000, window: '1h' }],
      },
    ],
    authPolicies: [
      { name: 'basic-team-policy', phase: 'Active', groups: ['system:authenticated'] },
      { name: 'pending-policy', phase: 'Pending', groups: ['beta-testers'] },
    ],
  },
  {
    id: 'llama-3-70b-instruct',
    modelDetails: {
      displayName: 'Llama 3 70B Instruct',
      description: 'A large open-weight model for complex reasoning and multi-turn dialogue',
      phase: 'Ready',
    },
    subscriptions: [
      {
        name: 'multi-group-llama-sub',
        displayName: 'Enterprise Multi-Group Llama Access',
        phase: 'Active',
        groups: [
          'platform-admins',
          'data-science-team',
          'ml-engineers',
          'analytics-team',
          'qa-engineers',
          'devops-team',
          'security-reviewers',
          'product-managers',
          'research-team',
          'frontend-devs',
          'backend-devs',
          'interns',
        ],
        tokenRateLimits: [
          { limit: 2000, window: '1m' },
          { limit: 80000, window: '1h' },
          { limit: 600000, window: '24h' },
        ],
      },
    ],
    authPolicies: [],
  },
  {
    id: 'gemma-7b-it',
    modelDetails: {
      displayName: 'Gemma 7B IT',
      description: 'Google Gemma 7B instruction-tuned model for general-purpose tasks',
      phase: 'Ready',
    },
    subscriptions: [],
    authPolicies: [
      {
        name: 'gemma-research-policy',
        displayName: 'Gemma Research Policy',
        phase: 'Active',
        groups: [
          'data-science-team',
          'ml-engineers',
          'research-team',
          'analytics-team',
          'qa-engineers',
          'platform-admins',
          'devops-team',
          'security-reviewers',
          'product-managers',
          'frontend-devs',
          'backend-devs',
          'interns',
        ],
      },
    ],
  },
];

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
  modelRefs: [
    {
      name: 'granite-3-8b-instruct',
      namespace: 'maas-models',
      displayName: 'Granite 3 8B Instruct',
      description:
        'Granite 3 8B Instruct is a large language model that is used for advanced tasks.',
    },
  ],
  subjects: { groups: [{ name: 'system:authenticated' }] },
});

export const mockPendingAuthPolicy = (): MaaSAuthPolicy => ({
  name: 'pending-policy',
  namespace: 'maas-system',
  phase: 'Pending',
  statusMessage: '',
  modelRefs: [
    {
      name: 'flan-t5-small',
      namespace: 'maas-models',
      displayName: 'Flan T5 Small',
      description: 'Flan T5 Small is a small language model that is used for basic tasks.',
    },
  ],
  subjects: { groups: [{ name: 'beta-testers' }] },
});

export const mockDeletingAuthPolicy = (): MaaSAuthPolicy => ({
  name: 'deleting-policy',
  namespace: 'maas-system',
  phase: 'Active',
  statusMessage: 'successfully reconciled',
  modelRefs: [
    {
      name: 'granite-3-8b-instruct',
      namespace: 'maas-models',
      displayName: 'Granite 3 8B Instruct',
      description:
        'Granite 3 8B Instruct is a large language model that is used for advanced tasks.',
    },
  ],
  subjects: { groups: [{ name: 'premium-users' }] },
  deletionTimestamp: '2025-04-07T12:00:00Z',
});

export const mockAuthPolicies = (): MaaSAuthPolicy[] => [
  {
    name: 'test-subscription-policy',
    namespace: 'maas-system',
    phase: 'Active',
    statusMessage: 'successfully reconciled',
    modelRefs: [
      {
        name: 'granite-3-8b-instruct',
        namespace: 'maas-models',
        displayName: 'Granite 3 8B Instruct',
        description:
          'Granite 3 8B Instruct is a large language model that is used for advanced tasks.',
      },
    ],
    subjects: { groups: [{ name: 'premium-users' }, { name: 'my-custom-group' }] },
  },
  {
    name: 'premium-team-policy',
    displayName: 'Premium Team Policy',
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
  {
    name: 'gemma-research-policy',
    displayName: 'Gemma Research Policy',
    namespace: 'maas-system',
    phase: 'Active',
    statusMessage: 'successfully reconciled',
    modelRefs: [{ name: 'gemma-7b-it', namespace: 'maas-models' }],
    subjects: {
      groups: [
        { name: 'data-science-team' },
        { name: 'ml-engineers' },
        { name: 'research-team' },
        { name: 'analytics-team' },
        { name: 'qa-engineers' },
        { name: 'platform-admins' },
        { name: 'devops-team' },
        { name: 'security-reviewers' },
        { name: 'product-managers' },
        { name: 'frontend-devs' },
        { name: 'backend-devs' },
        { name: 'interns' },
      ],
    },
  },
  mockFailedAuthPolicy(),
  mockPendingAuthPolicy(),
  mockDeletingAuthPolicy(),
];

export const mockPolicyInfo = (name = 'premium-team-policy'): PolicyInfoResponse => {
  const policy = mockAuthPolicies().find((p) => p.name === name) ?? mockAuthPolicies()[0];
  const resolvedName = policy.name;
  return {
    policy: {
      ...policy,
      displayName: policy.displayName ?? `${resolvedName} Display`,
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

export const mockPolicyInfoMissingModelSummaries = (): PolicyInfoResponse => {
  const policy: MaaSAuthPolicy = {
    name: 'missing-model-summary-policy',
    displayName: "Policy with model refs that don't exist",
    namespace: 'maas-system',
    phase: 'Active',
    statusMessage: 'successfully reconciled',
    modelRefs: [
      {
        name: 'deleted-model-ref',
        namespace: 'maas-models',
      },
    ],
    subjects: { groups: [{ name: 'premium-users' }] },
    creationTimestamp: '2025-03-01T10:00:00Z',
  };

  return {
    policy,
    modelRefs: [],
  };
};

export const mockMaasNamespaces = (
  names: string[] = ['test-project'],
): { name: string; displayName?: string }[] => names.map((name) => ({ name }));

export const mockExternalModel = (options: Partial<ExternalModel> = {}): ExternalModel => ({
  name: 'gpt-4o-external',
  namespace: 'test-project',
  displayName: 'GPT-4o External',
  description: 'External GPT-4o model routed through OpenAI provider.',
  modelName: 'gpt-4o',
  providerRefs: [
    {
      providerName: 'openai-prod',
      weight: 100,
      apiFormat: 'openai-chat',
      path: '/v1/chat/completions',
      targetModel: 'gpt-4o',
      provider: {
        displayName: 'OpenAI Production',
        endpointUrl: 'api.openai.com',
        authMechanism: 'apikey',
        credentialSecretRef: 'openai-api-key',
        provider: 'openai',
        phase: 'Ready',
        statusMessage: 'External provider is ready',
      },
    },
  ],
  phase: 'Ready',
  statusMessage: 'External model is ready',
  maaSModelRef: {
    phase: 'Ready',
    endpoint: 'https://gpt-4o-external.maas.example.com',
    statusMessage: 'Published external GPT-4o model',
  },
  ...options,
});

export const mockExternalModels = (): ExternalModel[] => [
  mockExternalModel(),
  mockExternalModel({
    name: 'claude-split',
    displayName: 'Claude A/B Split',
    description: 'Weighted routing across Anthropic and Bedrock providers.',
    modelName: 'claude-sonnet',
    providerRefs: [
      {
        providerName: 'anthropic-dev',
        weight: 60,
        apiFormat: 'anthropic',
        path: '/v1/messages',
        targetModel: 'claude-sonnet-4-5-20241022',
        provider: {
          displayName: 'Anthropic Development',
          endpointUrl: 'api.anthropic.com',
          authMechanism: 'apikey',
          credentialSecretRef: 'anthropic-api-key',
          provider: 'anthropic',
          phase: 'Ready',
          statusMessage: 'External provider is ready',
        },
      },
      {
        providerName: 'bedrock-us-east',
        weight: 40,
        apiFormat: 'anthropic',
        path: '/v1/messages',
        targetModel: 'anthropic.claude-3-sonnet',
        provider: {
          displayName: 'AWS Bedrock US East',
          endpointUrl: 'bedrock.us-east-1.amazonaws.com',
          authMechanism: 'sigv4',
          credentialSecretRef: 'bedrock-credentials-us-east',
          provider: 'aws-bedrock',
          phase: 'Ready',
          statusMessage: 'External provider is ready',
        },
      },
    ],
    phase: 'Ready',
    statusMessage: 'External model is ready',
    maaSModelRef: {
      phase: 'Ready',
      endpoint: 'https://claude-split.maas.example.com',
      statusMessage: 'Published Claude split model',
    },
  }),
  mockExternalModel({
    name: 'awaiting-pairing-model',
    displayName: 'Awaiting Pairing Model',
    description: 'Model waiting for subscription and auth pairing.',
    modelName: 'awaiting-model',
    phase: 'Pending',
    statusMessage: 'External model is pending',
    maaSModelRef: {
      phase: 'Pending',
      statusMessage: 'Awaiting governance pairing',
    },
  }),
  mockExternalModel({
    name: 'missing-ref-model',
    displayName: 'Missing Ref Model',
    description: 'External model without a MaaS model reference.',
    modelName: 'missing-ref',
    phase: 'Ready',
    statusMessage: 'External model is ready',
    maaSModelRef: undefined,
  }),
];

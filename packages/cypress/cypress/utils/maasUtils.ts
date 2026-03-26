import type { Tier, TierLimits } from '@odh-dashboard/maas/types/tier';
import type {
  APIKey,
  CreateAPIKeyResponse,
  CreateAPIKeyRequest,
} from '@odh-dashboard/maas/types/api-key';
import type { MaaSSubscription } from '@odh-dashboard/maas/types/subscriptions';

// Standardized tier templates - use these directly or as building blocks
export const MOCK_TIERS: Record<'free' | 'premium' | 'enterprise', Tier> = {
  free: {
    name: 'free',
    displayName: 'Free Tier',
    description: 'Basic access with limited usage',
    level: 1,
    groups: ['all-users'],
    limits: {
      tokensPerUnit: [{ count: 10000, time: 1, unit: 'hour' }],
      requestsPerUnit: [{ count: 100, time: 1, unit: 'minute' }],
    },
  },
  premium: {
    name: 'premium',
    displayName: 'Premium Tier',
    description: 'Enhanced access with higher limits',
    level: 2,
    groups: ['premium-users'],
    limits: {
      tokensPerUnit: [{ count: 50000, time: 1, unit: 'hour' }],
      requestsPerUnit: [{ count: 500, time: 1, unit: 'minute' }],
    },
  },
  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise Tier',
    description: 'Unlimited enterprise access',
    level: 3,
    groups: ['enterprise-users'],
    limits: {
      tokensPerUnit: [{ count: 1000000, time: 1, unit: 'hour' }],
      requestsPerUnit: [{ count: 10000, time: 1, unit: 'minute' }],
    },
  },
};

export const mockTiers = (): Tier[] => [MOCK_TIERS.free, MOCK_TIERS.premium, MOCK_TIERS.enterprise];

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
  },
  {
    id: 'key-ci-pipeline-003',
    name: 'ci-pipeline',
    description: 'API key for CI/CD pipeline automation',
    creationDate: '2026-01-11T11:54:34.521671447-05:00',
    expirationDate: '2026-01-18T11:54:34.521671447-05:00',
    status: 'revoked',
    username: 'carol',
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
  };
};

export const mockSubscriptions = (): MaaSSubscription[] => [
  {
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
    namespace: 'maas-system',
    phase: 'Active',
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
    creationTimestamp: '2025-02-15T08:00:00Z',
  },
];

export const mockTier = ({
  name = 'free',
  displayName,
  description,
  level = 1,
  groups = ['all-users'],
  limits = {
    tokensPerUnit: [{ count: 10000, time: 1, unit: 'hour' }],
    requestsPerUnit: [{ count: 100, time: 1, unit: 'minute' }],
  },
}: {
  name: string;
  displayName?: string;
  description?: string;
  level?: number;
  groups?: string[];
  limits?: TierLimits;
}): Tier => {
  return {
    name,
    displayName: displayName ?? `${name} Tier`,
    description: description ?? `${name} tier description`,
    level,
    groups,
    limits,
  };
};

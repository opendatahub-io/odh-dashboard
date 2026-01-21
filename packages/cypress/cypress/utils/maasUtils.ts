import type { Tier, TierLimits } from '@odh-dashboard/maas/types/tier';
import type { APIKey } from '@odh-dashboard/maas/types/api-key';

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
  },
  {
    id: 'key-dev-testing-002',
    name: 'development-testing',
    description: 'Development API key for testing purposes',
    creationDate: '2026-01-14T09:54:34.521671447-05:00',
    expirationDate: '2026-01-15T09:54:34.521671447-05:00',
    status: 'active',
  },
  {
    id: 'key-ci-pipeline-003',
    name: 'ci-pipeline',
    description: 'API key for CI/CD pipeline automation',
    creationDate: '2026-01-11T11:54:34.521671447-05:00',
    expirationDate: '2026-01-18T11:54:34.521671447-05:00',
    status: 'active',
  },
  {
    id: 'key-expired-old-004',
    name: 'old-service-key',
    description: 'Expired API key from previous deployment',
    creationDate: '2025-12-15T11:54:34.521671447-05:00',
    expirationDate: '2026-01-13T11:54:34.521671447-05:00',
    status: 'expired',
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

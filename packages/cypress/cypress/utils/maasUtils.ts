import type { Tier, TierLimits } from '@odh-dashboard/maas/types/tier';

// Standardized tier templates - use these directly or as building blocks
export const MOCK_TIERS: Record<'free' | 'premium' | 'enterprise', Tier> = {
  free: {
    name: 'free',
    displayName: 'Free Tier',
    description: 'Basic access with limited usage',
    level: 1,
    groups: ['all-users'],
    models: ['granite-7b', 'llama-3-8b'],
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
    models: ['granite-7b', 'llama-3-8b', 'granite-20b', 'mistral-7b'],
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
    models: ['granite-7b', 'llama-3-8b', 'granite-20b', 'mistral-7b', 'llama-3-70b'],
    limits: {
      tokensPerUnit: [{ count: 1000000, time: 1, unit: 'hour' }],
      requestsPerUnit: [{ count: 10000, time: 1, unit: 'minute' }],
    },
  },
};

export const mockTiers = (): Tier[] => [MOCK_TIERS.free, MOCK_TIERS.premium, MOCK_TIERS.enterprise];

export const mockTier = ({
  name = 'free',
  displayName,
  description,
  level = 1,
  groups = ['all-users'],
  models = ['model-1', 'model-2', 'model-3'],
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
  models?: string[];
  limits?: TierLimits;
}): Tier => {
  return {
    name,
    displayName: displayName ?? `${name} Tier`,
    description: description ?? `${name} tier description`,
    level,
    groups,
    models,
    limits,
  };
};

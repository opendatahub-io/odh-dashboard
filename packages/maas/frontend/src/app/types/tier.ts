/**
 * Represents a Tier for AI asset model endpoints
 * Tiers control which AI asset model endpoints users can access based on their group membership
 */
export type Tier = {
  name: string;
  displayName: string;
  description: string;
  level: number;
  groups: string[];
  models: string[];
  limits: TierLimits;
};

export type TierLimits = {
  tokensPerUnit: RateLimit;
  requestsPerUnit: RateLimit;
};

export type RateLimit = {
  tokens: number;
  time: number;
  unit: 'hour' | 'minute' | 'second' | 'millisecond';
};

/** Mock data for development */
export const mockTiers: Tier[] = [
  {
    name: 'free-tier',
    displayName: 'Free Tier',
    description: 'Free tier with access to all AI asset models and baseline rate limits',
    level: 1,
    groups: ['all-users'],
    models: ['gpt-3.5', 'llama-7b', 'mistral-7b'],
    limits: {
      tokensPerUnit: {
        tokens: 10000,
        time: 1,
        unit: 'hour',
      },
      requestsPerUnit: {
        tokens: 100,
        time: 1,
        unit: 'minute',
      },
    },
  },
  {
    name: 'premium-tier',
    displayName: 'Premium Tier',
    description: 'High-throughput tier for premium customers with access to all models',
    level: 10,
    groups: ['premium-users'],
    models: ['gpt-4', 'llama-70b', 'mistral-7b'],
    limits: {
      tokensPerUnit: {
        tokens: 500000,
        time: 1,
        unit: 'hour',
      },
      requestsPerUnit: {
        tokens: 10000,
        time: 1,
        unit: 'minute',
      },
    },
  },
  {
    name: 'enterprise-tier',
    displayName: 'Enterprise Tier',
    description: 'Unlimited access for enterprise users with all models and no expiration',
    level: 20,
    groups: ['enterprise-users', 'enterprise-admins'],
    models: ['gpt-4', 'llama-70b', 'claude-3'],
    limits: {
      tokensPerUnit: {
        tokens: 1000000,
        time: 1,
        unit: 'hour',
      },
      requestsPerUnit: {
        tokens: 10000,
        time: 1,
        unit: 'minute',
      },
    },
  },
];

export const mockAvailableGroups = [
  'all-users',
  'premium-users',
  'enterprise-users',
  'enterprise-admins',
];

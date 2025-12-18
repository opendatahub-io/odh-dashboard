/**
 * Represents a Tier for AI asset model endpoints
 * Tiers control which AI asset model endpoints users can access based on their group membership
 */
export type Tier = {
  name: string;
  displayName: string;
  description: string;
  level?: number;
  groups: string[];
  limits: TierLimits;
};

export type TierLimits = {
  tokensPerUnit: RateLimit[];
  requestsPerUnit: RateLimit[];
};

export type RateLimit = {
  count: number;
  time: number;
  unit: 'hour' | 'minute' | 'second' | 'millisecond';
};

export const mockAvailableGroups = [
  'all-users',
  'premium-users',
  'enterprise-users',
  'enterprise-admins',
];

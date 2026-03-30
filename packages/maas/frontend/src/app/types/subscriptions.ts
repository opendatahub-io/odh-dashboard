export type MaaSSubscription = {
  name: string;
  namespace: string;
  phase?: string;
  priority?: number;
  owner: OwnerSpec;
  modelRefs: ModelSubscriptionRef[];
  tokenMetadata?: TokenMetadata;
  creationTimestamp?: string;
};

export type ModelSubscriptionRef = {
  name: string;
  namespace: string;
  tokenRateLimits?: TokenRateLimit[];
  tokenRateLimitRef?: string;
  billingRate?: BillingRate;
};

export type BillingRate = {
  perToken: string;
};

export type TokenRateLimit = {
  limit: number;
  window: string;
};

export type OwnerSpec = {
  groups: GroupReference[];
};

export type GroupReference = {
  name: string;
};

export type TokenMetadata = {
  organizationId: string;
  costCenter: string;
  labels?: Record<string, string>;
};

export type MaaSSubscriptionListResponse = {
  object: string;
  data: MaaSSubscription[];
};

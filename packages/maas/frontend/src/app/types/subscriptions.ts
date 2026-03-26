export type MaaSSubscription = {
  name: string;
  displayName?: string;
  description?: string;
  namespace: string;
  phase: string;
  priority?: number;
  owner: OwnerSpec;
  modelRefs: ModelSubscriptionRef[];
  tokenMetadata?: TokenMetadata;
  creationTimestamp: string;
};

export type ModelSubscriptionRef = {
  name: string;
  namespace: string;
  tokenRateLimits: TokenRateLimit[];
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

export type ModelReference = {
  kind: string;
  name: string;
};

export type MaaSModelRefSummary = {
  name: string;
  namespace: string;
  displayName?: string;
  description?: string;
  modelRef: ModelReference;
  phase?: string;
  endpoint?: string;
};

export type SubscriptionFormDataResponse = {
  groups: string[];
  modelRefs: MaaSModelRefSummary[];
  subscriptions: MaaSSubscription[];
};

export type CreateSubscriptionRequest = {
  name: string;
  displayName?: string;
  description?: string;
  owner: OwnerSpec;
  modelRefs: ModelSubscriptionRef[];
  priority: number;
  createAuthPolicy: boolean;
};

export type CreateSubscriptionResponse = {
  subscription: MaaSSubscription;
  authPolicy?: MaaSAuthPolicy;
};

export type MaaSAuthPolicy = {
  name: string;
  namespace: string;
  phase?: string;
  modelRefs: { name: string; namespace: string }[];
  subjects: { groups: GroupReference[] };
  meteringMetadata?: TokenMetadata;
};

export type SubscriptionModelEntry = {
  modelRefSummary: MaaSModelRefSummary;
  tokenRateLimits: TokenRateLimit[];
};

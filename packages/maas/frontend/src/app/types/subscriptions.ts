export type MaaSSubscription = {
  name: string;
  namespace: string;
  phase?: string;
  displayName?: string;
  description?: string;
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

export type ModelRef = {
  name: string;
  namespace: string;
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

export type SubjectSpec = {
  groups: GroupReference[];
};

export type MaaSAuthPolicy = {
  name: string;
  namespace: string;
  phase?: string;
  modelRefs: ModelRef[];
  subjects: SubjectSpec;
  meteringMetadata?: TokenMetadata;
};

export type SubscriptionInfoResponse = {
  subscription: MaaSSubscription;
  modelRefs: MaaSModelRefSummary[];
  authPolicies: MaaSAuthPolicy[];
};

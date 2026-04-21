export type MaaSSubscription = {
  name: string;
  displayName?: string;
  description?: string;
  namespace: string;
  phase?: string;
  statusMessage?: string;
  priority?: number;
  owner: OwnerSpec;
  modelRefs: ModelSubscriptionRef[];
  tokenMetadata?: TokenMetadata;
  creationTimestamp?: string;
};

export type ModelSubscriptionRef = {
  name: string;
  namespace: string;
  tokenRateLimits: TokenRateLimit[];
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
  groups?: GroupReference[];
};

export type SubscriptionPolicyFormDataResponse = {
  groups: string[];
  modelRefs: MaaSModelRefSummary[];
  subscriptions: MaaSSubscription[];
  policies: MaaSAuthPolicy[];
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

export type UpdateSubscriptionRequest = {
  displayName?: string;
  description?: string;
  owner: OwnerSpec;
  modelRefs: ModelSubscriptionRef[];
  tokenMetadata?: TokenMetadata;
  priority: number;
};

export type CreateSubscriptionResponse = {
  subscription: MaaSSubscription;
  authPolicy?: MaaSAuthPolicy;
};

export type MaaSAuthPolicy = {
  displayName?: string;
  description?: string;
  name: string;
  namespace: string;
  phase?: string;
  statusMessage?: string;
  creationTimestamp?: string;
  modelRefs: ModelRef[];
  subjects: SubjectSpec;
  meteringMetadata?: TokenMetadata;
};

export type SubscriptionInfoResponse = {
  subscription: MaaSSubscription;
  modelRefs: MaaSModelRefSummary[];
  authPolicies: MaaSAuthPolicy[];
  meteringMetadata?: TokenMetadata;
};

export type SubscriptionModelEntry = {
  modelRefSummary: MaaSModelRefSummary;
  tokenRateLimits: TokenRateLimit[];
};

export type TokenRateLimitInfo = {
  limit: number;
  window: string;
};

export type BillingRateInfo = {
  per_token: string;
};

export type ModelRefInfo = {
  name: string;
  namespace?: string;
  token_rate_limits?: TokenRateLimitInfo[];
  billing_rate?: BillingRateInfo;
};

export type UserSubscription = {
  subscription_id_header: string;
  subscription_description: string;
  display_name?: string;
  priority: number;
  model_refs: ModelRefInfo[];
  organization_id?: string;
  cost_center?: string;
  labels?: Record<string, string>;
};

export type RateLimit = {
  count: number;
  time: number;
  unit: 'hour' | 'minute' | 'second';
};

import type {
  MaaSAuthPolicy,
  MaaSModelRefSummary,
  ModelRef,
  SubjectSpec,
  TokenMetadata,
} from './subscriptions';

type BasePolicyRequest = {
  displayName?: string;
  description?: string;
  modelRefs: ModelRef[];
  subjects: SubjectSpec;
  meteringMetadata?: TokenMetadata;
};

export type CreatePolicyRequest = BasePolicyRequest & {
  name: string;
};

export type UpdatePolicyRequest = BasePolicyRequest;

export type PolicyInfoResponse = {
  policy: MaaSAuthPolicy;
  modelRefs: MaaSModelRefSummary[];
};

export type DisplayNameAnnotations = Partial<{
  'openshift.io/description': string;
  'openshift.io/display-name': string;
}>;

export type K8sCondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastProbeTime?: string | null;
  lastTransitionTime?: string;
  lastHeartbeatTime?: string;
};

export type ListConfigSecretsResponse = {
  secrets: { name: string; keys: string[] }[];
  configMaps: { name: string; keys: string[] }[];
};

export type ConfigSecretItem = {
  name: string;
  keys: string[];
};

export type NamespaceKind = {
  name: string;
  displayName?: string;
};

export type CollectionResource = {
  id: string;
  tenant?: string;
  created_at?: string;
  updated_at?: string;
  read_only?: boolean;
  owner?: string;
};

export type CollectionPrimaryScore = {
  metric: string;
  lower_is_better: boolean;
};

export type CollectionPassCriteria = {
  threshold: number;
};

export type CollectionBenchmark = {
  id: string;
  provider_id?: string;
  weight?: number;
  primary_score?: CollectionPrimaryScore;
  pass_criteria?: CollectionPassCriteria;
  parameters?: Record<string, unknown>;
};

export type Collection = {
  resource: CollectionResource;
  name: string;
  description?: string;
  tags?: string[];
  custom?: Record<string, unknown>;
  pass_criteria?: CollectionPassCriteria;
  benchmarks?: CollectionBenchmark[];
};

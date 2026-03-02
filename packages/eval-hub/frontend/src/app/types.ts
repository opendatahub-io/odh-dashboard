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

// ---------------------------------------------------------------------------
// EvalHub evaluation job types matching the BFF response shape
// ---------------------------------------------------------------------------

export type EvaluationJobState =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'stopping'
  | 'stopped';

type JobMessage = {
  message?: string;
  message_code?: string;
};

type JobResource = {
  id: string;
  tenant?: string;
  created_at?: string;
  updated_at?: string;
  message?: JobMessage;
};

type JobStatus = {
  state: EvaluationJobState;
  message?: JobMessage;
  benchmarks?: BenchmarkState[];
};

type BenchmarkState = {
  id: string;
  provider_id?: string;
  status: string;
  completed_at?: string;
  error_message?: JobMessage;
};

type BenchmarkResult = {
  id: string;
  provider_id?: string;
  metrics?: Record<string, number>;
  artifacts?: BenchmarkArtifact;
};

type BenchmarkArtifact = {
  oci_digest?: string;
  oci_reference?: string;
  size_bytes?: number;
};

type JobResults = {
  total_evaluations: number;
  benchmarks?: BenchmarkResult[];
};

type JobModel = {
  url?: string;
  name: string;
};

type JobBenchmark = {
  id: string;
  provider_id?: string;
  parameters?: Record<string, unknown>;
};

export type EvaluationJob = {
  resource: JobResource;
  status: JobStatus;
  results: JobResults;
  model: JobModel;
  benchmarks: JobBenchmark[];
};

export type ListEvaluationJobsParams = {
  namespace?: string;
  limit?: number;
  offset?: number;
  status?: string;
  name?: string;
  tags?: string;
};

// ---------------------------------------------------------------------------
// Collection / Benchmark Suite types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Provider / Standardised Benchmarks
// ---------------------------------------------------------------------------

export type ProviderResource = {
  id: string;
  tenant?: string;
  created_at?: string;
  updated_at?: string;
  read_only?: boolean;
  owner?: string;
};

export type ProviderBenchmarkScore = {
  metric: string;
  lower_is_better: boolean;
};

export type ProviderBenchmarkPassCriteria = {
  threshold: number;
};

export type ProviderBenchmark = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  metrics?: string[];
  tags?: string[];
  num_few_shot?: number;
  dataset_size?: number;
  primary_score?: ProviderBenchmarkScore;
  pass_criteria?: ProviderBenchmarkPassCriteria;
};

export type ProviderEnvVar = {
  name: string;
  value: string;
};

export type ProviderK8sRuntime = {
  image?: string;
  entrypoint?: string[];
  cpu_request?: string;
  memory_request?: string;
  cpu_limit?: string;
  memory_limit?: string;
  env?: ProviderEnvVar[];
};

export type ProviderLocalRuntime = {
  command?: string;
  env?: ProviderEnvVar[];
};

export type ProviderRuntime = {
  k8s?: ProviderK8sRuntime;
  local?: ProviderLocalRuntime;
};

export type Provider = {
  resource: ProviderResource;
  name: string;
  title?: string;
  description?: string;
  tags?: string[];
  runtime?: ProviderRuntime;
  benchmarks?: ProviderBenchmark[];
};

export type ProvidersResponse = {
  items: Provider[];
  total_count?: number;
};

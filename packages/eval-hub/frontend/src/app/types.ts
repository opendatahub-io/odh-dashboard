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

// EvalHub evaluation job types matching the BFF response shape

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

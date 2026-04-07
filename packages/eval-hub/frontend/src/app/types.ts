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
// EvalHub health response type matching the BFF response shape
// ---------------------------------------------------------------------------

/**
 * The three states the /evalhub/health endpoint can report.
 *
 * - "healthy"             — CR found in dashboard namespace, service responded.
 * - "service-unreachable" — CR found (URL known) but service did not respond.
 * - "cr-not-found"        — No EvalHub CR in the dashboard namespace; operator not configured.
 */
export type EvalHubHealthStatus = 'healthy' | 'service-unreachable' | 'cr-not-found';

export type EvalHubHealthResponse = {
  status: EvalHubHealthStatus;
  available: boolean;
};

// ---------------------------------------------------------------------------
// EvalHub CR status types matching the BFF response shape
// ---------------------------------------------------------------------------

export type EvalHubCRPhase = 'Initializing' | 'Ready' | 'Failed' | 'Pending' | 'Unknown';

export type EvalHubCondition = {
  type: string;
  status: string;
  lastTransitionTime?: string;
  reason?: string;
  message?: string;
};

export type EvalHubCRStatus = {
  name: string;
  namespace: string;
  phase: EvalHubCRPhase;
  ready: string;
  url?: string;
  activeProviders?: string[];
  conditions?: EvalHubCondition[];
  lastUpdateTime?: string;
  readyReplicas: number;
  replicas: number;
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
  read_only?: boolean;
  owner?: string;
  mlflow_experiment_id?: string;
  message?: JobMessage;
};

type JobStatus = {
  state: EvaluationJobState;
  message?: JobMessage;
  benchmarks?: BenchmarkState[];
};

type BenchmarkState = {
  provider_id?: string;
  id: string;
  benchmark_index?: number;
  status: string;
  error_message?: JobMessage;
  started_at?: string;
  completed_at?: string;
};

type BenchmarkTestResult = {
  primary_score?: number;
  threshold?: number;
  pass?: boolean;
};

type BenchmarkResult = {
  id: string;
  provider_id?: string;
  benchmark_index?: number;
  metrics?: Record<string, unknown>;
  artifacts?: Record<string, unknown>;
  mlflow_run_id?: string;
  logs_path?: string;
  test?: BenchmarkTestResult;
};

type JobTestResult = {
  score?: number;
  threshold?: number;
  pass?: boolean;
};

type JobResults = {
  total_evaluations?: number;
  benchmarks?: BenchmarkResult[];
  mlflow_experiment_url?: string;
  test?: JobTestResult;
};

type ModelAuth = {
  secret_ref?: string;
};

type JobModel = {
  url?: string;
  name: string;
  parameters?: Record<string, unknown>;
  auth?: ModelAuth;
};

type JobPrimaryScore = {
  metric: string;
  lower_is_better: boolean;
};

type JobPassCriteria = {
  threshold: number;
};

type S3DataRef = {
  bucket?: string;
  key?: string;
  secret_ref?: string;
};

type TestDataRef = {
  s3?: S3DataRef;
};

type JobBenchmark = {
  id: string;
  provider_id?: string;
  weight?: number;
  primary_score?: JobPrimaryScore;
  pass_criteria?: JobPassCriteria;
  parameters?: Record<string, unknown>;
  test_data_ref?: TestDataRef;
};

type JobCollection = {
  id: string;
  benchmarks?: JobBenchmark[];
};

type ExperimentTag = {
  key: string;
  value: string;
};

type JobExperiment = {
  name?: string;
  tags?: ExperimentTag[];
  artifact_location?: string;
};

type OciCoordinates = {
  oci_host?: string;
  oci_repository?: string;
  oci_tag?: string;
  oci_subject?: string;
  annotations?: Record<string, string>;
};

type OciExport = {
  coordinates?: OciCoordinates;
  k8s?: { connection?: string };
};

type JobExports = {
  oci?: OciExport;
};

export type EvaluationJob = {
  resource: JobResource;
  status: JobStatus;
  results: JobResults;
  name?: string;
  description?: string;
  tags?: string[];
  model: JobModel;
  pass_criteria?: JobPassCriteria;
  benchmarks?: JobBenchmark[] | null;
  collection?: JobCollection;
  experiment?: JobExperiment;
  custom?: Record<string, unknown>;
  exports?: JobExports;
};

type PaginationLink = {
  href: string;
};

export type EvaluationJobsResponse = {
  first?: PaginationLink;
  next?: PaginationLink;
  limit?: number;
  total_count?: number;
  items: EvaluationJob[];
  errors?: string[];
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
  url?: string;
  provider_id?: string;
  weight?: number;
  primary_score?: CollectionPrimaryScore;
  pass_criteria?: CollectionPassCriteria;
  parameters?: Record<string, unknown>;
};

export type Collection = {
  resource: CollectionResource;
  name: string;
  category?: string;
  description?: string;
  tags?: string[];
  custom?: Record<string, unknown>;
  pass_criteria?: CollectionPassCriteria;
  benchmarks?: CollectionBenchmark[];
};

export type ListCollectionsParams = {
  namespace?: string;
  limit?: number;
  offset?: number;
  name?: string;
  category?: string | null;
  tags?: string[];
  scope?: string;
};

export type CollectionsListResponse = {
  items: Collection[];
  total_count?: number;
  limit?: number;
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
  url?: string;
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

export type FlatBenchmark = ProviderBenchmark & { providerId: string; providerName: string };

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

// ---------------------------------------------------------------------------
// Create Evaluation Job request / response
// ---------------------------------------------------------------------------

export type CreateEvaluationJobRequest = {
  name: string;
  description?: string;
  tags?: string[];
  model: {
    url: string;
    name: string;
    parameters?: Record<string, unknown>;
    auth?: {
      secret_ref?: string;
    };
  };
  pass_criteria?: JobPassCriteria;
  benchmarks?: JobBenchmark[];
  collection?: JobCollection;
  experiment?: JobExperiment;
  custom?: Record<string, unknown>;
  exports?: JobExports;
};

export type CreateEvaluationJobResponse = EvaluationJob;

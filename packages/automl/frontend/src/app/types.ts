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

/** Pipeline reference embedded in a run (API schema). */
export type PipelineVersionReference = {
  pipeline_id: string;
  pipeline_version_id: string;
};

export type PipelineSpec = Record<string, unknown>;

/** Known KFP run states. API may return other values; use string for flexibility. */
export type PipelineRunState =
  | 'SUCCEEDED'
  | 'FAILED'
  | 'RUNNING'
  | 'PENDING'
  | 'SKIPPED'
  | 'PAUSED'
  | 'INCOMPLETE'
  | 'COMPLETE'
  | 'CANCELLED';

export type PipelineRun = {
  run_id: string;
  display_name: string;
  created_at: string;
  state: PipelineRunState | string;
  experiment_id?: string;
  storage_state?: string;
  description?: string;
  pipeline_version_id?: string;
  pipeline_spec?: PipelineSpec;
  pipeline_version_reference?: PipelineVersionReference;
  service_account?: string;
  scheduled_at?: string;
  finished_at?: string;
};

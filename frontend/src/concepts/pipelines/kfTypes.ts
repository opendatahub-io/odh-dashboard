import { ExactlyOne } from '~/typeHelpers';

/* Types pulled from https://www.kubeflow.org/docs/components/pipelines/v1/reference/api/kubeflow-pipeline-api-spec */
// TODO: Determine what is optional and what is not

/**
 * ISO Format: "{YYYY}-{MM}-{DD}T{HH}:{MM}:{SS}Z"
 */
export type DateTimeKF = string;

export enum PipelinesFilterOp {
  UNKNOWN = 'UNKNOWN',

  // Operators on scalar values. Only applies to one of |int_value|,
  // |long_value|, |string_value| or |timestamp_value|.
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_THAN_EQUALS = 'GREATER_THAN_EQUALS',
  LESS_THAN = 'LESS_THAN',
  LESS_THAN_EQUALS = 'LESS_THAN_EQUALS',

  // Checks if the value is a member of a given array, which should be one of
  // |int_values|, |long_values| or |string_values|.
  IN = 'IN',

  // Checks if the value contains |string_value| as a substring match. Only
  // applies to |string_value|.
  IS_SUBSTRING = 'IS_SUBSTRING',
}

export type PipelinesFilterPredicate = {
  operation: PipelinesFilterOp;
  key: string;
} & ExactlyOne<{
  int_value: number;
  long_value: number;
  string_value: string;
  timestamp_value: string;
  int_values: { values: number[] };
  long_values: { values: string[] };
  string_values: { values: string[] };
}>;

export type PipelineKFCallCommon<UniqueProps> = {
  total_size?: number;
  next_page_token?: string;
  // Note: if Kubeflow backend determines no results, it doesn't even give you your structure, you get an empty object
} & Partial<UniqueProps>;

export enum ResourceTypeKF {
  UNKNOWN_RESOURCE_TYPE = 'UNKNOWN_RESOURCE_TYPE',
  EXPERIMENT = 'EXPERIMENT',
  JOB = 'JOB',
  PIPELINE = 'PIPELINE',
  PIPELINE_VERSION = 'PIPELINE_VERSION',
  NAMESPACE = 'NAMESPACE',
}
export enum RelationshipKF {
  UNKNOWN_RELATIONSHIP = 'UNKNOWN_RELATIONSHIP',
  OWNER = 'OWNER',
  CREATOR = 'CREATOR',
}

export enum RunStorageStateKF {
  AVAILABLE = 'STORAGESTATE_AVAILABLE',
  ARCHIVED = 'STORAGESTATE_ARCHIVED',
}

export enum RunMetricFormatKF {
  UNSPECIFIED = 'UNSPECIFIED',
  RAW = 'RAW',
  PERCENTAGE = 'PERCENTAGE',
}

/**
 * @deprecated
 * Replace with RuntimeStateKF
 */
export enum PipelineRunStatusesKF {
  STARTED = 'Started',
  COMPLETED = 'Completed',
  RUNNING = 'Running',
  CANCELLED = 'Cancelled',
  FAILED = 'Failed',
}

export enum JobModeKF {
  UNKNOWN_MODE = 'UNKNOWN_MODE',
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

/**
 * @deprecated
 * Replace with StorageStateKFv2
 */
export enum StorageStateKF {
  STORAGESTATE_UNSPECIFIED = 'STORAGESTATE_UNSPECIFIED',
  STORAGESTATE_AVAILABLE = 'STORAGESTATE_AVAILABLE',
  STORAGESTATE_ARCHIVED = 'STORAGESTATE_ARCHIVED',
}

export enum StorageStateKFv2 {
  STORAGE_STATE_UNSPECIFIED = 'STORAGE_STATE_UNSPECIFIED',
  AVAILABLE = 'AVAILABLE',
  ARCHIVED = 'ARCHIVED',
}

export type ParameterKF = {
  name: string;
  value: string;
};

/**
 * @deprecated
 * Use PipelineVersionKFv2 for all new stories
 */
export type PipelineVersionKF = {
  id: string;
  name: string;
  created_at: string;
  parameters?: ParameterKF[];
  code_source_url?: string;
  package_url?: UrlKF;
  resource_references: ResourceReferenceKF[];
  description?: string;
};

export type PipelineVersionKFv2 = PipelineCoreResourceKFv2 & {
  pipeline_id: string;
  pipeline_version_id: string;
  pipeline_spec: NonNullable<unknown>; // TODO replace this with the actual type: https://issues.redhat.com/browse/RHOAIENG-2279
  code_source_url?: string;
  package_url?: UrlKF;
  error?: GoogleRpcStatusKF;
};

export type ResourceKeyKF = {
  type: ResourceTypeKF;
  id: string;
};

/**
 * @deprecated
 * No longer exists in KFv2
 */
export type ResourceReferenceKF = {
  key: ResourceKeyKF;
  name?: string;
  relationship: RelationshipKF;
};

export type UrlKF = {
  pipeline_url: string;
};

export type PipelineSpecRuntimeConfig = {
  parameters: Record<string, unknown>;
  pipeline_root?: string;
};

export type RunMetricKF = {
  /** It must between 1 and 63 characters long and must conform to the following regular expression: [a-z]([-a-z0-9]*[a-z0-9])? */
  name: string;
  node_id: string;
  number_value: number;
  format: RunMetricFormatKF;
};

export type PipelineSpecKF = {
  pipeline_id?: string;
  pipeline_name?: string;
  workflow_manifest?: string;
  pipeline_manifests?: string;
  parameters?: ParameterKF[];
  runtime_config: PipelineSpecRuntimeConfig;
};

export type CronScheduleKF = {
  start_time?: DateTimeKF;
  end_time?: DateTimeKF;
  cron: string;
};

export type PeriodicScheduleKF = {
  start_time?: DateTimeKF;
  end_time?: DateTimeKF;
  interval_second: string;
};

export type TriggerKF = {
  cron_schedule?: CronScheduleKF;
  periodic_schedule?: PeriodicScheduleKF;
};

/**
 * @deprecated
 * Use PipelineCoreResourceKFv2 for all new stories
 */
export type PipelineCoreResourceKF = {
  id: string;
  name: string;
  description?: string;
  resource_references?: ResourceReferenceKF[];
};

export type PipelineCoreResourceKFv2 = {
  display_name: string;
  description?: string;
  created_at: string;
};

export type GoogleRpcStatusKF = {
  code: number;
  message: string;
  details: {
    type_url: string;
    value: string;
  }[];
};

export type PipelineKFv2 = PipelineCoreResourceKFv2 & {
  pipeline_id: string;
  error?: GoogleRpcStatusKF;
};

/**
 * @deprecated
 * Use PipelineKFv2 for all new stories
 */
export type PipelineKF = PipelineCoreResourceKF & {
  created_at: DateTimeKF;
  parameters?: ParameterKF[];
  url?: UrlKF;
  error?: string;
  default_version?: PipelineVersionKF;
};

export type PipelineVersionReferenceKF = {
  pipeline_id: string;
  pipeline_version_id: string;
};

export enum RunStorageStateKFv2 {
  STORAGE_STATE_UNSPECIFIED = 'STORAGE_STATE_UNSPECIFIED',
  AVAILABLE = 'AVAILABLE',
  ARCHIVED = 'ARCHIVED',
}

export enum RuntimeStateKF {
  RUNTIME_STATE_UNSPECIFIED = 'RUNTIME_STATE_UNSPECIFIED',
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
  CANCELING = 'CANCELING',
  CANCELED = 'CANCELED',
  PAUSED = 'PAUSED',
}

export const runtimeStateLabels = {
  [RuntimeStateKF.RUNTIME_STATE_UNSPECIFIED]: 'Unspecified',
  [RuntimeStateKF.PENDING]: 'Pending',
  [RuntimeStateKF.RUNNING]: 'Running',
  [RuntimeStateKF.SUCCEEDED]: 'Succeeded',
  [RuntimeStateKF.SKIPPED]: 'Skipped',
  [RuntimeStateKF.FAILED]: 'Failed',
  [RuntimeStateKF.CANCELING]: 'Canceling',
  [RuntimeStateKF.CANCELED]: 'Canceled',
  [RuntimeStateKF.PAUSED]: 'Paused',
};

export type RunDetailsKF = {
  pipeline_context_id: string;
  pipeline_run_context_id: string;
  task_details: object[];
};

export type PipelineRunKFv2 = PipelineCoreResourceKFv2 & {
  experiment_id: string;
  run_id: string;
  storage_state: RunStorageStateKFv2;
  pipeline_version_id?: string;
  pipeline_spec?: object;
  pipeline_version_reference: PipelineVersionReferenceKF;
  runtime_config: PipelineSpecRuntimeConfig;
  service_account: string;
  scheduled_at: string;
  finished_at: string;
  state: RuntimeStateKF;
  error?: GoogleRpcStatusKF;
  run_details: RunDetailsKF;
  recurring_run_id?: string;
  state_history: object[];
};

/**
 * @deprecated
 * Replace with PipelineRunKFv2
 */
export type PipelineRunKF = PipelineCoreResourceKF & {
  storage_state: RunStorageStateKF;
  pipeline_spec: PipelineSpecKF;
  service_account: string;
  created_at: DateTimeKF;
  scheduled_at: DateTimeKF;
  finished_at: DateTimeKF;
  status: PipelineRunStatusesKF | string;
  error: string;
  metrics: RunMetricKF[];
};

export type PipelineRunJobKF = PipelineCoreResourceKF & {
  pipeline_spec: PipelineSpecKF;
  service_account?: string;
  max_concurrency: string;
  trigger: TriggerKF;
  mode: JobModeKF;
  created_at: DateTimeKF;
  updated_at: DateTimeKF;
  status: string;
  error: string;
  enabled?: boolean;
  no_catchup: boolean;
};

/**
 * @deprecated
 * Replace with PipelineRunKFv2
 */
export type PipelineRunResourceKF = {
  pipeline_runtime: {
    workflow_manifest: string;
  };
  run: PipelineRunKF;
};

/**
 * @deprecated
 * Replace with ExperimentKFv2
 */
export type ExperimentKF = {
  id: string;
  name: string;
  description?: string;
  created_at: DateTimeKF;
  resource_references?: ResourceReferenceKF[];
  storage_state: StorageStateKF;
};

export type ExperimentKFv2 = {
  experiment_id: string;
  display_name: string;
  description: string;
  created_at: string;
  namespace?: string;
  storage_state: StorageStateKFv2;
};

export type ListExperimentsResponseKF = PipelineKFCallCommon<{
  experiments: ExperimentKF[];
}>;
export type ListPipelinesResponseKF = PipelineKFCallCommon<{
  pipelines: PipelineKFv2[];
}>;
export type ListPipelineRunsResourceKF = PipelineKFCallCommon<{
  runs: PipelineRunKF[];
}>;
export type ListPipelineRunJobsResourceKF = PipelineKFCallCommon<{
  jobs: PipelineRunJobKF[];
}>;
export type ListPipelineVersionTemplateResourceKF = {
  /** YAML template of a PipelineRunKind */
  template: string;
};
export type ListPipelineVersionsResourceKF = PipelineKFCallCommon<{
  pipeline_versions: PipelineVersionKFv2[];
}>;

/**
 * @deprecated
 * Replace with CreatePipelineRunKFv2Data
 */
export type CreatePipelineRunKFData = Omit<
  PipelineRunKF,
  | 'id'
  | 'status'
  | 'created_at'
  | 'finished_at'
  | 'scheduled_at'
  | 'pipeline_spec'
  | 'storage_state'
  | 'error'
  | 'metrics'
> & {
  pipeline_spec: Pick<PipelineSpecKF, 'parameters'>;
};

export type CreatePipelineRunKFv2Data = Omit<
  PipelineRunKFv2,
  | 'run_id'
  | 'recurring_run_id'
  | 'experiment_id'
  | 'created_at'
  | 'finished_at'
  | 'scheduled_at'
  | 'pipeline_spec'
  | 'storage_state'
  | 'error'
  | 'state'
  | 'state_history'
  | 'run_details'
> & {
  pipeline_spec: Pick<PipelineSpecKF, 'parameters'>;
};

export type CreatePipelineRunJobKFData = Omit<
  PipelineRunJobKF,
  | 'id'
  | 'status'
  | 'created_at'
  | 'finished_at'
  | 'updated_at'
  | 'scheduled_at'
  | 'pipeline_spec'
  | 'storage_state'
  | 'mode'
  | 'error'
  | 'metrics'
  | 'no_catchup'
> & {
  pipeline_spec: Pick<PipelineSpecKF, 'parameters'>;
};

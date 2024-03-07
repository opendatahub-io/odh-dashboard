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

/** @deprecated resource type is no longer a concept in v2 */
export enum ResourceTypeKF {
  UNKNOWN_RESOURCE_TYPE = 'UNKNOWN_RESOURCE_TYPE',
  EXPERIMENT = 'EXPERIMENT',
  JOB = 'JOB',
  PIPELINE = 'PIPELINE',
  PIPELINE_VERSION = 'PIPELINE_VERSION',
  NAMESPACE = 'NAMESPACE',
}
/**
 * @deprecated relationship is not a concept in v2
 */
export enum RelationshipKF {
  UNKNOWN_RELATIONSHIP = 'UNKNOWN_RELATIONSHIP',
  OWNER = 'OWNER',
  CREATOR = 'CREATOR',
}

/**
 * @deprecated
 * Replace with RunStorageStateKFv2
 */
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

/**
 * @deprecated
 * Replace with RecurringRunMode
 */
export enum JobModeKF {
  UNKNOWN_MODE = 'UNKNOWN_MODE',
  ENABLED = 'ENABLE',
  DISABLED = 'DISABLED',
}

export enum RecurringRunMode {
  MODE_UNSPECIFIED = 'MODE_UNSPECIFIED',
  ENABLE = 'ENABLE',
  DISABLE = 'DISABLE',
}

export enum RecurringRunStatus {
  STATUS_UNSPECIFIED = 'STATUS_UNSPECIFIED',
  ENABLED = 'ENABLE',
  DISABLED = 'DISABLE',
}

export enum StorageStateKF {
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

export enum InputDefinitionParameterType {
  NumberInteger = 'NUMBER_INTEGER',
  Boolean = 'BOOLEAN',
  String = 'STRING',
}

// https://www.kubeflow.org/docs/components/pipelines/v2/reference/api/kubeflow-pipeline-api-spec/#/definitions/v2beta1PipelineVersion
export type PipelineSpec = Record<string, unknown> & {
  pipelineInfo: {
    name: string;
  };
  root: Record<string, unknown> & {
    inputDefinitions: {
      parameters: Record<string, { parameterType: InputDefinitionParameterType }>;
    };
  };
  schemaVersion: string;
  sdkVersion: string;
};

export type PipelineVersionKFv2 = PipelineCoreResourceKFv2 & {
  pipeline_id: string;
  pipeline_version_id: string;
  pipeline_spec: PipelineSpec;
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

export type RuntimeConfigParameters = Record<string, string | number | boolean>;

export type PipelineSpecRuntimeConfig = {
  parameters: RuntimeConfigParameters;
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

export type TaskDetailKF = {
  run_id: string;
  task_id: string;
  display_name: string;
  create_time: string;
  start_time: string;
  end_time: string;
  executor_detail?: PipelineTaskExecutorDetailKF;
  state: RuntimeStateKF;
  execution_id?: string;
  error?: GoogleRpcStatusKF;
  inputs?: ArtifactListKF;
  outputs?: ArtifactListKF;
  parent_task_id?: string;
  state_history: RuntimeStatusKF[];
  pod_name?: string;
  child_tasks?: PipelineTaskDetailChildTask[];
};

type PipelineTaskDetailChildTask = {
  task_id?: string;
  pod_name: string;
};

type ArtifactListKF = {
  artifact_ids: string[];
};

type PipelineTaskExecutorDetailKF = {
  main_job: string;
  pre_caching_check_job: string;
  failed_main_jobs: string[];
  failed_pre_caching_check_jobs: string[];
};

export type RuntimeStatusKF = {
  update_time: string;
  state: RuntimeStateKF;
  error?: GoogleRpcStatusKF;
};
export type RunDetailsKF = {
  pipeline_context_id: string;
  pipeline_run_context_id: string;
  task_details: TaskDetailKF[];
};

export type PipelineRunKFv2 = PipelineCoreResourceKFv2 & {
  experiment_id: string;
  run_id: string;
  storage_state: StorageStateKF;
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
  storage_state: StorageStateKF;
  pipeline_spec: PipelineSpecKF;
  service_account: string;
  created_at: DateTimeKF;
  scheduled_at: DateTimeKF;
  finished_at: DateTimeKF;
  status: PipelineRunStatusesKF | string;
  error: string;
  metrics: RunMetricKF[];
};

/**
 * @deprecated
 * Use PipelineRunJobKFv2 for all new stories
 */
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

export type PipelineVersionReference = {
  pipeline_id: string;
  pipeline_version_id: string;
};

export type PipelineRunJobKFv2 = PipelineCoreResourceKFv2 & {
  pipeline_spec?: PipelineSpecKF;
  service_account?: string;
  max_concurrency: string;
  trigger: TriggerKF;
  mode: RecurringRunMode;
  created_at: DateTimeKF;
  updated_at: DateTimeKF;
  status: RecurringRunStatus;
  error?: GoogleRpcStatusKF;
  no_catchup?: boolean;
  recurring_run_id: string;
  pipeline_version_reference: PipelineVersionReference;
  runtime_config?: PipelineSpecRuntimeConfig;
  namespace: string;
  experiment_id: string;
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
  storage_state: StorageStateKF;
};

export type ListExperimentsResponseKF = PipelineKFCallCommon<{
  experiments: ExperimentKFv2[];
}>;
export type ListPipelinesResponseKF = PipelineKFCallCommon<{
  pipelines: PipelineKFv2[];
}>;
export type ListPipelineRunsResourceKF = PipelineKFCallCommon<{
  runs: PipelineRunKFv2[];
}>;
export type ListPipelineRunJobsResourceKF = PipelineKFCallCommon<{
  recurringRuns: PipelineRunJobKFv2[];
}>;
export type ListPipelineVersionsKF = PipelineKFCallCommon<{
  pipeline_versions: PipelineVersionKFv2[];
}>;

export type CreatePipelineAndVersionKFData = {
  pipeline: Omit<PipelineKFv2, 'pipeline_id' | 'error' | 'created_at'>;
  pipeline_version: Omit<
    PipelineVersionKFv2,
    'pipeline_id' | 'pipeline_version_id' | 'error' | 'created_at' | 'pipeline_spec'
  >;
};

export type CreatePipelineVersionKFData = Omit<
  PipelineVersionKFv2,
  'pipeline_version_id' | 'error' | 'created_at' | 'pipeline_spec'
>;

export type CreateExperimentKFData = Omit<
  ExperimentKFv2,
  'experiment_id' | 'created_at' | 'namespace' | 'storage_state'
>;
export type CreatePipelineRunKFData = Omit<
  PipelineRunKFv2,
  | 'run_id'
  | 'recurring_run_id'
  | 'created_at'
  | 'finished_at'
  | 'scheduled_at'
  | 'pipeline_spec'
  | 'storage_state'
  | 'error'
  | 'state'
  | 'state_history'
  | 'run_details'
>;

export type CreatePipelineRunJobKFData = Omit<
  PipelineRunJobKFv2,
  | 'recurring_run_id'
  | 'status'
  | 'created_at'
  | 'updated_at'
  | 'scheduled_at'
  | 'pipeline_spec'
  | 'storage_state'
  | 'error'
  | 'namespace'
>;

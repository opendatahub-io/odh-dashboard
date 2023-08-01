/* Types pulled from https://www.kubeflow.org/docs/components/pipelines/v1/reference/api/kubeflow-pipeline-api-spec */
// TODO: Determine what is optional and what is not

/**
 * ISO Format: "{YYYY}-{MM}-{DD}T{HH}:{MM}:{SS}Z"
 */
export type DateTimeKF = string;

type PipelineKFCallCommon<UniqueProps> = {
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

export enum PipelineRunStatusesKF {
  STARTED = 'Started',
  COMPLETED = 'Completed',
  RUNNING = 'Running',
  CANCELLED = 'Cancelled',
  FAILED = 'Failed',
}
export const PipelineRunStatusUnknown = 'Unknown';

export enum JobModeKF {
  UNKNOWN_MODE = 'UNKNOWN_MODE',
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

export enum StorageStateKF {
  STORAGESTATE_UNSPECIFIED = 'STORAGESTATE_UNSPECIFIED',
  STORAGESTATE_AVAILABLE = 'STORAGESTATE_AVAILABLE',
  STORAGESTATE_ARCHIVED = 'STORAGESTATE_ARCHIVED',
}

export type ParameterKF = {
  name: string;
  value: string;
};

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

export type ResourceKeyKF = {
  type: ResourceTypeKF;
  id: string;
};

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
  // protobufValue??
  pipeline_root: string;
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

export type PipelineCoreResourceKF = {
  id: string;
  name: string;
  description?: string;
  resource_references?: ResourceReferenceKF[];
};

export type PipelineKF = PipelineCoreResourceKF & {
  created_at: DateTimeKF;
  parameters?: ParameterKF[];
  url?: UrlKF;
  error?: string;
  default_version: PipelineVersionKF;
};

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

export type PipelineRunResourceKF = {
  pipeline_runtime: {
    workflow_manifest: string;
  };
  run: PipelineRunKF;
};

export type ExperimentKF = {
  id: string;
  name: string;
  description?: string;
  created_at: DateTimeKF;
  resource_references?: ResourceReferenceKF[];
  storage_state: StorageStateKF;
};

export type ListExperimentsResponseKF = PipelineKFCallCommon<{
  experiments: ExperimentKF[];
}>;
export type ListPipelinesResponseKF = PipelineKFCallCommon<{
  pipelines: PipelineKF[];
}>;
export type ListPipelineRunsResourceKF = PipelineKFCallCommon<{
  runs: PipelineRunKF[];
}>;
export type ListPipelineRunJobsResourceKF = PipelineKFCallCommon<{
  jobs: PipelineRunJobKF[];
}>;
export type ListPipelineTemplateResourceKF = {
  /** YAML template of a PipelineRunKind */
  template: string;
};

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

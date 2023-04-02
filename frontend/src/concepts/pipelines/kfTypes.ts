/* Types pulled from https://www.kubeflow.org/docs/components/pipelines/v1/reference/api/kubeflow-pipeline-api-spec */
// TODO: Determine what is optional and what is not

/**
 * Format: "{YYYY}-{MM}-{DD}T{HH}:{MM}:{SS}Z"
 */
type DateTimeKF = string;

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
  workflow_manifests?: string;
  pipeline_manifests?: string;
  parameters: ParameterKF[];
  runtime_config: PipelineSpecRuntimeConfig;
};

export type PipelineKF = {
  id: string;
  created_at: DateTimeKF;
  name: string;
  description: string;
  parameters?: ParameterKF[];
  url?: UrlKF;
  error?: string;
  default_version: PipelineVersionKF;
  resource_references?: ResourceReferenceKF;
};

export type PipelineRunKF = {
  id: string;
  name: string;
  storage_state: RunStorageStateKF;
  description: string;
  pipeline_spec: PipelineSpecKF;
  resource_reference: ResourceReferenceKF;
  service_account: string;
  created_at: DateTimeKF;
  scheduled_at: DateTimeKF;
  finished_at: DateTimeKF;
  status: string;
  error: string;
  metrics: RunMetricKF[];
};

export type ListPipelinesResponseKF = PipelineKFCallCommon<{
  pipelines: PipelineKF[];
}>;
export type ListPipelineRunsResourceKF = PipelineKFCallCommon<{
  runs: PipelineRunKF[];
}>;

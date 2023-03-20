/* Types pulled from https://www.kubeflow.org/docs/components/pipelines/v1/reference/api/kubeflow-pipeline-api-spec */
// TODO: Determine what is optional and what is not

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

export type PipelineKF = {
  id: string;
  created_at: string;
  name: string;
  description: string;
  parameters?: ParameterKF[];
  url?: UrlKF;
  error?: string;
  default_version: PipelineVersionKF;
  resource_references?: ResourceReferenceKF;
};

export type ListPipelinesResponseKF = {
  pipelines: PipelineKF[];
  total_size: number;
  next_page_token?: string;
};

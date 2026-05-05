import type { ComponentType, CSSProperties } from 'react';

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

export type IconType = ComponentType<{ style?: CSSProperties }>;

export type PipelineDefinition = {
  pipeline_id: string;
  display_name: string;
  created_at: string;
  description?: string;
};

/** Pipeline reference embedded in a run (API schema). */
export type PipelineVersionReference = {
  pipeline_id: string;
  pipeline_version_id: string;
};

export type PipelineRunRuntimeConfig = {
  parameters?: Record<string, unknown>;
  pipeline_root?: string;
};

export type PipelineRunErrorDetail = {
  '@type'?: string;
  type_url?: string;
  value?: string;
  [key: string]: unknown;
};

export type PipelineRunError = {
  code: number;
  message: string;
  details?: PipelineRunErrorDetail[];
};

import type { PipelineSpecVariable } from '~/app/types/pipeline';

export type PipelineSpec = PipelineSpecVariable;

export type PipelineRunTaskDetail = {
  run_id?: string;
  task_id: string;
  display_name?: string;
  create_time?: string;
  start_time?: string;
  end_time?: string;
  state?: string;
  execution_id?: string;
  child_tasks?: { pod_name?: string; task_id?: string }[];
  error?: PipelineRunError;
};

export type PipelineRunDetails = {
  task_details?: PipelineRunTaskDetail[];
};

export type PipelineRunStateHistoryEntry = {
  update_time: string;
  state?: string;
};

export type PipelineRun = {
  run_id: string;
  display_name: string;
  created_at: string;
  state: string;
  experiment_id?: string;
  storage_state?: string;
  description?: string;
  pipeline_version_id?: string;
  pipeline_spec?: PipelineSpec;
  pipeline_version_reference?: PipelineVersionReference;
  runtime_config?: PipelineRunRuntimeConfig;
  service_account?: string;
  scheduled_at?: string;
  finished_at?: string;
  error?: PipelineRunError;
  run_details?: PipelineRunDetails;
  state_history?: PipelineRunStateHistoryEntry[];
};

export type LlamaStackModelType = 'llm' | 'embedding';

export type LlamaStackModel = {
  id: string;
  type: LlamaStackModelType;
  provider: string;
  resource_path: string;
};

export type LlamaStackModelsResponse = {
  models: LlamaStackModel[];
};

export type LlamaStackVectorStoreProvider = {
  provider_id: string;
  provider_type: string;
};

export type LlamaStackVectorStoreProvidersResponse = {
  vector_store_providers: LlamaStackVectorStoreProvider[];
};

export type LlamaStackFilteredVectorStoreProvidersResponse =
  LlamaStackVectorStoreProvidersResponse & {
    totalProviderCount: number;
  };

export type SecretListItem = {
  uuid: string;
  name: string;
  type?: string;
  data?: Record<string, string>;
  displayName?: string;
  description?: string;
};

export type S3ObjectInfo = {
  key: string;
  last_modified?: string;
  etag?: string;
  size: number;
  storage_class?: string;
};

export type S3CommonPrefix = {
  prefix: string;
};

export type S3ListObjectsResponse = {
  common_prefixes: S3CommonPrefix[];
  contents: S3ObjectInfo[];
  continuation_token?: string;
  delimiter?: string;
  is_truncated: boolean;
  key_count: number;
  max_keys: number;
  name?: string;
  next_continuation_token?: string;
  prefix?: string;
};

export type Envelope<M, D> = {
  metadata: M;
  data: D;
};

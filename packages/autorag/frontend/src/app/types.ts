// Modules -------------------------------------------------------------------->

import type { ComponentType, CSSProperties } from 'react';
import type { PipelineSpecVariable, RuntimeStateKF } from '~/app/types/pipeline';

// Types ---------------------------------------------------------------------->

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
  state: '' | `${RuntimeStateKF}`;
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

export type OgxModelType = 'llm' | 'embedding';

export type OgxModel = {
  id: string;
  type: OgxModelType;
  provider: string;
  resource_path: string;
};

export type OgxModelsResponse = {
  models: OgxModel[];
};

export type OgxVectorStoreProvider = {
  provider_id: string;
  provider_type: string;
};

export type OgxVectorStoreProvidersResponse = {
  vector_store_providers: OgxVectorStoreProvider[];
};

export type OgxFilteredVectorStoreProvidersResponse = OgxVectorStoreProvidersResponse & {
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

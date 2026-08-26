// Modules -------------------------------------------------------------------->

import type { ComponentType, CSSProperties } from 'react';
import type {
  NamespaceKind as SharedNamespaceKind,
  SecretListItem as SharedSecretListItem,
  S3ObjectInfo as SharedS3ObjectInfo,
  S3CommonPrefix as SharedS3CommonPrefix,
  S3ListObjectsResponse as SharedS3ListObjectsResponse,
  PipelineVersionReference as SharedPipelineVersionReference,
  PipelineRunRuntimeConfig as SharedPipelineRunRuntimeConfig,
  PipelineRunErrorDetail as SharedPipelineRunErrorDetail,
  PipelineRunError as SharedPipelineRunError,
  PipelineSpec as SharedPipelineSpec,
  PipelineRunTaskDetail as SharedPipelineRunTaskDetail,
  PipelineRunDetails as SharedPipelineRunDetails,
  PipelineRunStateHistoryEntry as SharedPipelineRunStateHistoryEntry,
  PipelineRun as SharedPipelineRun,
} from '@odh-dashboard/autox-core/ui/api';

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

export type NamespaceKind = SharedNamespaceKind;

export type IconType = ComponentType<{ style?: CSSProperties }>;

export type PipelineDefinition = {
  pipeline_id: string;
  display_name: string;
  created_at: string;
  description?: string;
};

export type ManagedPipelineType = 'autorag' | 'indexing';

export type ManagedPipeline = {
  pipeline_type: ManagedPipelineType;
  pipeline_id: string;
  pipeline_version_id: string;
  display_name: string;
};

export type CreateIndexingPipelineRunRequest = {
  display_name: string;
  description?: string;
  /** Runtime parameters from pattern.indexing.pipeline_spec.parameters */
  parameters: Record<string, unknown>;
};

/** Pipeline reference embedded in a run (API schema). */
export type PipelineVersionReference = SharedPipelineVersionReference;

export type PipelineRunRuntimeConfig = SharedPipelineRunRuntimeConfig;

export type PipelineRunErrorDetail = SharedPipelineRunErrorDetail;

export type PipelineRunError = SharedPipelineRunError;

export type PipelineSpec = SharedPipelineSpec;

export type PipelineRunTaskDetail = SharedPipelineRunTaskDetail;

export type PipelineRunDetails = SharedPipelineRunDetails;

export type PipelineRunStateHistoryEntry = SharedPipelineRunStateHistoryEntry;

export type PipelineRun<TParams = Record<string, unknown>> = SharedPipelineRun<TParams>;

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

export type SecretListItem = SharedSecretListItem;

export type S3ObjectInfo = SharedS3ObjectInfo;

export type S3CommonPrefix = SharedS3CommonPrefix;

export type S3ListObjectsResponse = SharedS3ListObjectsResponse;

export type Envelope<M, D> = {
  metadata: M;
  data: D;
};

export type OgxCredentials = {
  baseUrl: string;
  apiKey: string;
};

export type EvaluationFileEntry = {
  question: string;
  correct_answers: string[];
  correct_answer_document_ids: string[];
};

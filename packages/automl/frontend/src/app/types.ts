// Modules -------------------------------------------------------------------->

import type { ComponentType, CSSProperties } from 'react';
import { PipelineSpecVariable, RuntimeStateKF } from '~/app/types/pipeline';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';

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
  parameters?: ConfigureSchema;
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
  state_history?: PipelineRunStateHistoryEntry[];
  run_details?: PipelineRunDetails;
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

export type TaskType = 'binary' | 'multiclass' | 'regression' | 'timeseries';

export type FeatureImportanceData = {
  importance: Record<string, number>;
  stddev?: Record<string, number>;
  p_value?: Record<string, number>;
  n?: Record<string, number>;
  p99_high?: Record<string, number>;
  p99_low?: Record<string, number>;
};

export type ConfusionMatrixData = Partial<Record<string, Partial<Record<string, number>>>>;

export type ModelRegistry = {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_ready: boolean;
  server_url: string;
  external_url?: string;
};

export type ModelRegistriesResponse = {
  model_registries: ModelRegistry[];
};

export type RegisterModelResponse = {
  registered_model_id: string;
  model_artifact: Record<string, unknown>;
};

export type RegisterModelRequest = {
  s3_path: string;
  model_name: string;
  model_description?: string;
  version_name: string;
  version_description?: string;
  artifact_name?: string;
  artifact_description?: string;
  model_format_name?: string;
  model_format_version?: string;
};

export type RocCurveEntry = {
  auc: number;
  fpr: number[];
  tpr: number[];
  thresholds: (number | string)[];
};

export type MulticlassRocCurveEntry = RocCurveEntry & {
  support: number;
};

export type PrecisionRecallEntry = {
  average_precision: number;
  precision: number[];
  recall: number[];
  thresholds: (number | string)[];
  baseline_precision: number;
};

export type BinaryCurvesData = {
  task_type: 'binary';
  positive_class: string | number;
  num_samples: number;
  num_positive: number;
  num_negative: number;
  roc_curve: RocCurveEntry;
  precision_recall_curve: PrecisionRecallEntry;
};

export type MulticlassCurvesData = {
  task_type: 'multiclass';
  strategy: string;
  num_classes: number;
  classes: (string | number)[];
  num_samples: number;
  roc_curve: {
    auc_macro: number;
    auc_weighted: number;
    per_class: Record<string, MulticlassRocCurveEntry>;
  };
  precision_recall_curve: {
    average_precision_macro: number;
    average_precision_weighted: number;
    per_class: Record<string, PrecisionRecallEntry>;
  };
};

export type CurvesData = BinaryCurvesData | MulticlassCurvesData;

export type BackTestingForecastPoint = {
  timestamp: string;
  actual: number;
  predicted: number;
  lower_bound: number;
  upper_bound: number;
  lower_quantile?: number;
  upper_quantile?: number;
};

export type BackTestingWindowEntry = {
  window_id: number;
  metrics: Record<string, number>;
  forecast_data: BackTestingForecastPoint[];
};

export type BackTestingSeriesPerformer = {
  item_id: string;
  avg_metrics: Record<string, number>;
  windows: BackTestingWindowEntry[];
};

export type BackTestingPerWindowMetric = {
  window_id: number;
  cutoff?: number;
  test_start: string;
  test_end: string;
  metrics: Record<string, number>;
};

export type BackTestingData = {
  schema_version?: number;
  model_name: string;
  prediction_length: number;
  num_val_windows: number;
  eval_metric: string;
  target: string;
  id_column: string;
  timestamp_column: string;
  per_window_metrics: BackTestingPerWindowMetric[];
  series_analysis: {
    num_series_evaluated: number;
    best_performer: BackTestingSeriesPerformer;
    worst_performer: BackTestingSeriesPerformer;
  };
};

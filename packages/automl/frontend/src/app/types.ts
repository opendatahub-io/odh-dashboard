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

export type NamespaceKind = SharedNamespaceKind;

export type IconType = ComponentType<{ style?: CSSProperties }>;

export type PipelineDefinition = {
  pipeline_id: string;
  display_name: string;
  created_at: string;
  description?: string;
};

/** Pipeline reference embedded in a run (API schema). */
export type PipelineVersionReference = SharedPipelineVersionReference;

export type PipelineRunRuntimeConfig = SharedPipelineRunRuntimeConfig<ConfigureSchema>;

export type PipelineRunErrorDetail = SharedPipelineRunErrorDetail;

export type PipelineRunError = SharedPipelineRunError;

export type PipelineSpec = SharedPipelineSpec;

export type PipelineRunTaskDetail = SharedPipelineRunTaskDetail;

export type PipelineRunDetails = SharedPipelineRunDetails;

export type PipelineRunStateHistoryEntry = SharedPipelineRunStateHistoryEntry;

/** AutoML pipeline runs carry a strongly-typed `runtime_config.parameters` (see `ConfigureSchema`). */
export type PipelineRun = SharedPipelineRun<ConfigureSchema>;

export type SecretListItem = SharedSecretListItem;

export type S3ObjectInfo = SharedS3ObjectInfo;

export type S3CommonPrefix = SharedS3CommonPrefix;

export type S3ListObjectsResponse = SharedS3ListObjectsResponse;

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

import { DeploymentMode, asEnumMember } from 'mod-arch-core';

const STYLE_THEME = process.env.STYLE_THEME || 'patternfly-theme';
const DEPLOYMENT_MODE =
  asEnumMember(process.env.DEPLOYMENT_MODE, DeploymentMode) || DeploymentMode.Federated;
const DEV_MODE = process.env.APP_ENV === 'development';
const POLL_INTERVAL = process.env.POLL_INTERVAL ? parseInt(process.env.POLL_INTERVAL) : 30000;
const KUBEFLOW_USERNAME = process.env.KUBEFLOW_USERNAME || 'user@example.com';
const IMAGE_DIR = process.env.IMAGE_DIR || 'images';
const LOGO_LIGHT = process.env.LOGO || 'logo-light-theme.svg';
const MANDATORY_NAMESPACE = process.env.MANDATORY_NAMESPACE || undefined;
const URL_PREFIX = '/automl';
const BFF_API_VERSION = 'v1';
const DEFAULT_PAGE_SIZE = 20;
const COMPANY_URI = process.env.COMPANY_URI || 'oci://odh.io';

export {
  STYLE_THEME,
  POLL_INTERVAL,
  DEV_MODE,
  KUBEFLOW_USERNAME,
  IMAGE_DIR,
  LOGO_LIGHT,
  URL_PREFIX,
  DEPLOYMENT_MODE,
  BFF_API_VERSION,
  DEFAULT_PAGE_SIZE,
  MANDATORY_NAMESPACE,
  COMPANY_URI,
};

export const FindAdministratorOptions = [
  'The person who gave you your username, or who helped you to log in for the first time',
  'Someone in your IT department or help desk',
  'A project manager or developer',
];

// Task types
export const TASK_TYPE_BINARY = 'binary';
export const TASK_TYPE_MULTICLASS = 'multiclass';
export const TASK_TYPE_REGRESSION = 'regression';
export const TASK_TYPE_TIMESERIES = 'timeseries';
const TABULAR_TASK_TYPES = [TASK_TYPE_BINARY, TASK_TYPE_MULTICLASS, TASK_TYPE_REGRESSION] as const;
export const TASK_TYPES = [...TABULAR_TASK_TYPES, TASK_TYPE_TIMESERIES] as const;

export const DEFAULT_EVAL_METRIC_BY_TASK: Partial<Record<string, EvalMetric>> = {
  [TASK_TYPE_BINARY]: 'accuracy',
  [TASK_TYPE_MULTICLASS]: 'accuracy',
  [TASK_TYPE_REGRESSION]: 'r2',
  [TASK_TYPE_TIMESERIES]: 'MASE',
};

// Configure constants
/** Human-readable labels for task type values. */
export const TASK_TYPE_LABELS: Record<string, string> = {
  [TASK_TYPE_BINARY]: 'Binary classification',
  [TASK_TYPE_MULTICLASS]: 'Multiclass classification',
  [TASK_TYPE_REGRESSION]: 'Regression',
  [TASK_TYPE_TIMESERIES]: 'Time series forecasting',
};

export const REQUIRED_CONNECTION_SECRET_KEYS: Readonly<Partial<Record<string, readonly string[]>>> =
  {
    s3: ['AWS_S3_BUCKET', 'AWS_DEFAULT_REGION'],
  };

export const MAX_DISPLAY_NAME_LENGTH = 250;
export const MAX_DESCRIPTION_LENGTH = 255;
export const MIN_TOP_N = 1;
export const MAX_TOP_N_TABULAR = 10;
export const MAX_TOP_N_TIMESERIES = 7;
export const MAX_PREDICTION_LENGTH = 100;

export const PRESET_FASTER = 'speed';
export const PRESET_BETTER_QUALITY = 'balanced';
export const PRESETS = [PRESET_FASTER, PRESET_BETTER_QUALITY] as const;

export const PRESET_LABELS: Record<string, string> = {
  [PRESET_FASTER]: 'Faster',
  [PRESET_BETTER_QUALITY]: 'Better quality',
};

/* eslint-disable camelcase */
// Timeseries metrics use uppercase API names (e.g. MASE) while model result data
// uses snake_case keys (e.g. mean_absolute_scaled_error). This map bridges the two.
export const METRIC_ALIASES: Readonly<Record<string, string>> = {
  MAE: 'mean_absolute_error',
  MSE: 'mean_squared_error',
  RMSE: 'root_mean_squared_error',
  RMSLE: 'root_mean_squared_logarithmic_error',
  MAPE: 'mean_absolute_percentage_error',
  SMAPE: 'symmetric_mean_absolute_percentage_error',
  MASE: 'mean_absolute_scaled_error',
  RMSSE: 'root_mean_squared_scaled_error',
  WAPE: 'weighted_absolute_percentage_error',
  WQL: 'weighted_quantile_loss',
  SQL: 'scaled_quantile_loss',
};
/* eslint-enable camelcase */

// Eval metric enums per task type
export const EVAL_METRICS_BINARY = [
  'accuracy',
  'balanced_accuracy',
  'log_loss',
  'f1',
  'f1_macro',
  'f1_micro',
  'f1_weighted',
  'roc_auc',
  'average_precision',
  'precision',
  'precision_macro',
  'precision_micro',
  'precision_weighted',
  'recall',
  'recall_macro',
  'recall_micro',
  'recall_weighted',
  'mcc',
  'pac_score',
] as const;

export const EVAL_METRICS_MULTICLASS = [
  'accuracy',
  'balanced_accuracy',
  'log_loss',
  'f1_macro',
  'f1_micro',
  'f1_weighted',
  'roc_auc_ovo',
  'roc_auc_ovo_weighted',
  'roc_auc_ovr',
  'roc_auc_ovr_micro',
  'roc_auc_ovr_weighted',
  'precision_macro',
  'precision_micro',
  'precision_weighted',
  'recall_macro',
  'recall_micro',
  'recall_weighted',
  'mcc',
  'pac_score',
] as const;

export const EVAL_METRICS_REGRESSION = [
  'root_mean_squared_error',
  'mean_squared_error',
  'mean_absolute_error',
  'median_absolute_error',
  'mean_absolute_percentage_error',
  'r2',
  'symmetric_mean_absolute_percentage_error',
] as const;

export const EVAL_METRICS_TIMESERIES = [
  'SQL',
  'WQL',
  'MAE',
  'MAPE',
  'MASE',
  'MSE',
  'RMSE',
  'RMSLE',
  'RMSSE',
  'SMAPE',
  'WAPE',
] as const;

// These metrics are registered aliases in AutoGluon that map to the same underlying computation
// as their canonical counterparts. We accept them from existing runs but don't show them in the UI.
export const EVAL_METRICS_OTHER = ['roc_auc_ovo_macro', 'roc_auc_ovr_macro'] as const;

export const ALL_EVAL_METRICS = [
  ...EVAL_METRICS_BINARY,
  ...EVAL_METRICS_MULTICLASS,
  ...EVAL_METRICS_REGRESSION,
  ...EVAL_METRICS_TIMESERIES,
  ...EVAL_METRICS_OTHER,
] as const;

export type EvalMetric = (typeof ALL_EVAL_METRICS)[number];

// Maps alias metrics from EVAL_METRICS_OTHER to their canonical equivalents
// so reconfiguring a job swaps them to the metric shown in the UI.
/* eslint-disable camelcase */
export const EVAL_METRIC_ALIASES: Record<string, EvalMetric> = {
  roc_auc_ovo_macro: 'roc_auc_ovo',
  roc_auc_ovr_macro: 'roc_auc_ovr',
};
/* eslint-enable camelcase */

export const EVAL_METRICS_BY_TASK_TYPE: Partial<Record<string, readonly EvalMetric[]>> = {
  [TASK_TYPE_BINARY]: EVAL_METRICS_BINARY,
  [TASK_TYPE_MULTICLASS]: EVAL_METRICS_MULTICLASS,
  [TASK_TYPE_REGRESSION]: EVAL_METRICS_REGRESSION,
  [TASK_TYPE_TIMESERIES]: EVAL_METRICS_TIMESERIES,
};

/* eslint-disable camelcase */
export const EVAL_METRIC_DESCRIPTIONS: Record<EvalMetric, string> = {
  accuracy: 'Fraction of labels predicted correctly',
  balanced_accuracy: 'Average recall per class, accounting for class imbalance',
  log_loss: 'Logarithmic loss (cross-entropy) on predicted probabilities',
  f1: 'F1 score for the positive class',
  f1_macro: 'F1 averaged unweighted across classes',
  f1_micro: 'F1 computed globally over all TP / FP / FN',
  f1_weighted: 'F1 averaged weighted by support per class',
  roc_auc: 'Area under the ROC curve for the positive class',
  roc_auc_ovo: 'ROC AUC with one-vs-one multiclass strategy, macro-averaged across pairs',
  roc_auc_ovo_weighted: 'One-vs-one ROC AUC, weighted by class prevalence',
  roc_auc_ovr: 'ROC AUC with one-vs-rest multiclass strategy, macro-averaged across classes',
  roc_auc_ovr_micro: 'One-vs-rest ROC AUC, micro-averaged',
  roc_auc_ovr_weighted: 'One-vs-rest ROC AUC, weighted by class prevalence',
  average_precision: 'Area under the precision-recall curve',
  precision: 'Precision for the positive class',
  precision_macro: 'Precision, macro average',
  precision_micro: 'Precision, micro average',
  precision_weighted: 'Precision, weighted by support',
  recall: 'Recall for the positive class',
  recall_macro: 'Recall, macro average',
  recall_micro: 'Recall, micro average',
  recall_weighted: 'Recall, weighted by support',
  mcc: 'Matthews correlation coefficient (-1 to +1)',
  pac_score: 'Probabilistic accuracy score (PAC)',
  root_mean_squared_error: 'Square root of mean squared error',
  mean_squared_error: 'Mean squared error of predictions',
  mean_absolute_error: 'Mean absolute error of predictions',
  median_absolute_error: 'Median absolute error (robust to outliers)',
  mean_absolute_percentage_error:
    'MAPE: mean absolute percentage error (avoid if targets can be zero)',
  r2: 'Coefficient of determination (R²)',
  symmetric_mean_absolute_percentage_error: 'Symmetric MAPE variant (sMAPE-style behavior)',
  SQL: 'Scaled quantile loss — scale-normalized quantile loss across the horizon',
  WQL: 'Weighted quantile loss — distributional forecast accuracy over quantiles',
  MAE: 'Mean absolute error on point forecasts',
  MAPE: 'Mean absolute percentage error on point forecasts',
  MASE: 'Mean absolute scaled error — error scaled by a seasonal naive baseline',
  MSE: 'Mean squared error on point forecasts',
  RMSE: 'Root mean squared error on point forecasts',
  RMSLE:
    'Root mean squared logarithmic error — RMSE in log space (useful for heavy-tailed targets)',
  RMSSE: 'Root mean squared scaled error — RMSE-style error scaled similarly to MASE',
  SMAPE: 'Symmetric mean absolute percentage error on point forecasts',
  WAPE: 'Weighted absolute percentage error — scale-dependent aggregate error across series',
  roc_auc_ovo_macro: 'One-vs-one ROC AUC, macro-averaged across pairs',
  roc_auc_ovr_macro: 'One-vs-rest ROC AUC, macro-averaged across classes',
};
/* eslint-enable camelcase */

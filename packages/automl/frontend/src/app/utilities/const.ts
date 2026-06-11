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

export const DEFAULT_EVAL_METRIC_BY_TASK: Record<string, EvalMetric> = {
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
export const EVAL_METRICS_CLASSIFICATION = [
  'accuracy',
  'balanced_accuracy',
  'log_loss',
  'f1',
  'f1_macro',
  'f1_micro',
  'f1_weighted',
  'roc_auc',
  'roc_auc_ovo',
  'roc_auc_ovo_macro',
  'roc_auc_ovo_weighted',
  'roc_auc_ovr',
  'roc_auc_ovr_macro',
  'roc_auc_ovr_micro',
  'roc_auc_ovr_weighted',
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

export const ALL_EVAL_METRICS = [
  ...EVAL_METRICS_CLASSIFICATION,
  ...EVAL_METRICS_REGRESSION,
  ...EVAL_METRICS_TIMESERIES,
] as const;

export type EvalMetric = (typeof ALL_EVAL_METRICS)[number];

export const EVAL_METRICS_BY_TASK_TYPE: Partial<Record<string, readonly EvalMetric[]>> = {
  [TASK_TYPE_BINARY]: EVAL_METRICS_CLASSIFICATION,
  [TASK_TYPE_MULTICLASS]: EVAL_METRICS_CLASSIFICATION,
  [TASK_TYPE_REGRESSION]: EVAL_METRICS_REGRESSION,
  [TASK_TYPE_TIMESERIES]: EVAL_METRICS_TIMESERIES,
};

/* eslint-disable camelcase */
export const EVAL_METRIC_DESCRIPTIONS: Record<EvalMetric, string> = {
  accuracy: 'Overall correctness of predictions',
  balanced_accuracy: 'Average recall per class — good for imbalanced data',
  log_loss: 'Penalizes confident wrong predictions',
  f1: 'Harmonic mean of precision and recall',
  f1_macro: 'Unweighted mean of per-class F1 scores',
  f1_micro: 'F1 computed on aggregate true/false positives',
  f1_weighted: 'Weighted mean of per-class F1 scores',
  roc_auc: 'Area under the ROC curve — best for imbalanced classes',
  roc_auc_ovo: 'ROC AUC using one-vs-one strategy',
  roc_auc_ovo_macro: 'Macro-averaged one-vs-one ROC AUC',
  roc_auc_ovo_weighted: 'Weighted one-vs-one ROC AUC',
  roc_auc_ovr: 'ROC AUC using one-vs-rest strategy',
  roc_auc_ovr_macro: 'Macro-averaged one-vs-rest ROC AUC',
  roc_auc_ovr_micro: 'Micro-averaged one-vs-rest ROC AUC',
  roc_auc_ovr_weighted: 'Weighted one-vs-rest ROC AUC',
  average_precision: 'Area under precision-recall curve',
  precision: 'Accuracy of positive predictions',
  precision_macro: 'Unweighted mean of per-class precision',
  precision_micro: 'Precision computed on aggregate counts',
  precision_weighted: 'Weighted mean of per-class precision',
  recall: 'Coverage of actual positives',
  recall_macro: 'Unweighted mean of per-class recall',
  recall_micro: 'Recall computed on aggregate counts',
  recall_weighted: 'Weighted mean of per-class recall',
  mcc: 'Matthews correlation coefficient — balanced measure for binary classes',
  pac_score: 'Probabilistic accuracy score',
  root_mean_squared_error: 'Square root of mean squared differences',
  mean_squared_error: 'Average of squared differences between actual and predicted',
  mean_absolute_error: 'Average of absolute differences between actual and predicted',
  median_absolute_error: 'Median of absolute differences — robust to outliers',
  mean_absolute_percentage_error: 'Average percentage error — avoid if targets can be zero',
  r2: 'Proportion of variance explained by the model',
  symmetric_mean_absolute_percentage_error: 'Symmetric version of MAPE — handles near-zero values',
  SQL: 'Scaled quantile loss — evaluates quantile forecasts',
  WQL: 'Weighted quantile loss — weighted average across quantiles',
  MAE: 'Mean absolute error for time series',
  MAPE: 'Mean absolute percentage error for time series',
  MASE: 'Mean absolute scaled error — scale-independent accuracy measure',
  MSE: 'Mean squared error for time series',
  RMSE: 'Root mean squared error for time series',
  RMSLE: 'Root mean squared logarithmic error — useful for heavy-tailed targets',
  RMSSE: 'Root mean squared scaled error — normalized by naive baseline',
  SMAPE: 'Symmetric mean absolute percentage error for time series',
  WAPE: 'Weighted absolute percentage error — handles zero actuals gracefully',
};
/* eslint-enable camelcase */

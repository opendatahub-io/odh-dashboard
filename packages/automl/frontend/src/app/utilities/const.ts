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

export const AUTOML_OPTIMIZED_METRIC_BY_TASK = {
  [TASK_TYPE_BINARY]: 'accuracy',
  [TASK_TYPE_MULTICLASS]: 'accuracy',
  [TASK_TYPE_REGRESSION]: 'r2',
  [TASK_TYPE_TIMESERIES]: 'mase',
};

// Configure constants
/** Human-readable labels for task type values. */
export const TASK_TYPE_LABELS: Record<string, string> = {
  [TASK_TYPE_BINARY]: 'Binary classification',
  [TASK_TYPE_MULTICLASS]: 'Multiclass classification',
  [TASK_TYPE_REGRESSION]: 'Regression',
  [TASK_TYPE_TIMESERIES]: 'Time series forecasting',
};

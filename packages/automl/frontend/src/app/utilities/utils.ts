import type { PipelineRun, TaskType } from '~/app/types';
import { RuntimeStateKF } from '~/app/types/pipeline';
import {
  TASK_TYPE_BINARY,
  TASK_TYPE_MULTICLASS,
  TASK_TYPE_REGRESSION,
  TASK_TYPE_TIMESERIES,
} from './const';

/**
 * Whether the run is in a state where it can be terminated (stopped).
 */
export const isRunTerminatable = (state: string | undefined): boolean => {
  const s = state?.toUpperCase();
  return (
    s === RuntimeStateKF.RUNNING || s === RuntimeStateKF.PENDING || s === RuntimeStateKF.PAUSED
  );
};

/**
 * Whether the run is still in progress (not yet in a terminal state).
 * Includes CANCELING — the pipeline is still running but cannot be stopped again.
 */
export const isRunInProgress = (state: string | undefined): boolean => {
  const s = state?.toUpperCase();
  return (
    s === RuntimeStateKF.RUNNING || s === RuntimeStateKF.PENDING || s === RuntimeStateKF.CANCELING
  );
};

/**
 * Whether the run is in a terminal failure state where it can be retried.
 */
export const isRunRetryable = (state: string | undefined): boolean => {
  const s = state?.toUpperCase();
  return s === RuntimeStateKF.FAILED || s === RuntimeStateKF.CANCELED;
};

/**
 * Whether the run is in a terminal state where it can be deleted.
 */
export const isRunDeletable = (state: string | undefined): boolean => {
  const s = state?.toUpperCase();
  return (
    s === RuntimeStateKF.SUCCEEDED || s === RuntimeStateKF.FAILED || s === RuntimeStateKF.CANCELED
  );
};

/**
 * Extracts HTTP status from Error.message when handleRestFailures (mod-arch-core)
 * has flattened AxiosError to a plain Error, so 403/404/503 branches can still run.
 * @param error - The error object to parse
 * @returns The HTTP status code, or undefined if not found
 */
export function parseErrorStatus(error: Error): number | undefined {
  const match =
    error.message.match(/\bstatus\s+code\s+(\d{3})\b/i) ??
    error.message.match(/\bstatus[:\s]+(\d{3})\b/i) ??
    error.message.match(/\b(403|404|503)\b/);
  if (match) {
    const code = parseInt(match[1], 10);
    return code >= 100 && code < 600 ? code : undefined;
  }
  return undefined;
}

/**
 * Extracts the task type from a pipeline run's runtime parameters.
 * - Returns the task_type value when present.
 * - Defaults to timeseries when parameters exist but task_type is missing
 *   (timeseries is the only task that omits this parameter).
 * - Returns undefined when runtime_config.parameters is absent.
 */
export const getTaskType = (pipelineRun?: PipelineRun): TaskType | undefined => {
  const params = pipelineRun?.runtime_config?.parameters;
  if (!params) {
    return undefined;
  }
  if (!Object.prototype.hasOwnProperty.call(params, 'task_type')) {
    return TASK_TYPE_TIMESERIES;
  }
  return params.task_type;
};

/**
 * Determines if a task type is tabular.
 * @param pipelineRun - The pipeline run to check
 * @returns true if the task type is tabular, false otherwise
 */
export const isTabularRun = (pipelineRun?: PipelineRun): boolean => {
  const taskType = getTaskType(pipelineRun) ?? TASK_TYPE_TIMESERIES;

  return [TASK_TYPE_BINARY, TASK_TYPE_MULTICLASS, TASK_TYPE_REGRESSION].includes(taskType);
};

/**
 * Format metric keys from snake_case to a human-readable label.
 * Handles common ML acronyms as special cases.
 */
/* eslint-disable camelcase */
const METRIC_DISPLAY_NAMES: Record<string, string> = {
  f1: 'F₁',
  mean_absolute_error: 'MAE',
  mean_absolute_percentage_error: 'MAPE',
  mean_absolute_scaled_error: 'MASE',
  mean_squared_error: 'MSE',
  median_absolute_error: 'MedAE',
  mcc: 'MCC',
  pearsonr: 'Pearson r',
  r2: 'R²',
  roc_auc: 'ROC AUC',
  root_mean_squared_error: 'RMSE',
  root_mean_squared_logarithmic_error: 'RMSLE',
  root_mean_squared_scaled_error: 'RMSSE',
  scaled_quantile_loss: 'SQL',
  symmetric_mean_absolute_percentage_error: 'SMAPE',
  weighted_absolute_percentage_error: 'WAPE',
  weighted_quantile_loss: 'WQL',
};
/* eslint-enable camelcase */

export function formatMetricName(key: string): string {
  if (METRIC_DISPLAY_NAMES[key]) {
    return METRIC_DISPLAY_NAMES[key];
  }
  // Title-case: capitalize the first letter of each word separated by '_'.
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format metric values for display.
 * Uses scientific notation for non-zero values that would round to 0.000.
 */
export function formatMetricValue(value: number | string): string {
  if (typeof value === 'string') {
    return value;
  }
  // If the value would round to 0.000 but is actually non-zero, use scientific notation
  const fixed = value.toFixed(3);
  if ((fixed === '0.000' || fixed === '-0.000') && value !== 0) {
    return value.toExponential(3);
  }
  return fixed;
}

/**
 * Safely coerce an unknown metric value to a number.
 * Returns 0 for non-numeric / missing values.
 */
export function toNumericMetric(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Gets the optimized metric for a given task type.
 * @param taskType - The task type to get the metric for
 * @returns The optimized metric name, or 'Unknown metric' if no mapping exists
 */
export function getOptimizedMetricForTask(taskType: string): string {
  switch (taskType) {
    case TASK_TYPE_BINARY:
    case TASK_TYPE_MULTICLASS:
      return 'accuracy';
    case TASK_TYPE_REGRESSION:
      return 'r2';
    case TASK_TYPE_TIMESERIES:
      return 'mean_absolute_scaled_error';
    default:
      return 'Unknown metric';
  }
}

/**
 * Build a mapping from model name → leaderboard rank (1-based).
 * Ranks are assigned by sorting on the optimized metric descending (higher is better).
 * AutoGluon negates error/loss metrics so all metrics are uniformly "higher is better".
 */
export function computeRankMap(
  models: Record<string, { metrics: { test_data?: Record<string, unknown> } }>,
  taskType: string,
): Record<string, number> {
  const optimizedMetric = getOptimizedMetricForTask(taskType);

  const sorted = Object.keys(models).toSorted((a, b) => {
    const aMetric = models[a].metrics.test_data?.[optimizedMetric];
    const bMetric = models[b].metrics.test_data?.[optimizedMetric];
    const aVal = aMetric != null ? toNumericMetric(aMetric) : -Infinity;
    const bVal = bMetric != null ? toNumericMetric(bMetric) : -Infinity;
    return bVal - aVal;
  });

  return Object.fromEntries(sorted.map((name, i) => [name, i + 1]));
}

/** Trigger a browser download for a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

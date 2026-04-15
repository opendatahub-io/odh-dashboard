import type { PipelineRun } from '~/app/types';
import {
  TASK_TYPE_BINARY,
  TASK_TYPE_MULTICLASS,
  TASK_TYPE_REGRESSION,
  TASK_TYPE_TIMESERIES,
} from './const';

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
 * Determines if a task type is tabular.
 * @param pipelineRun - The pipeline run to check
 * @returns true if the task type is tabular, false otherwise
 */
export const isTabularRun = (pipelineRun?: PipelineRun): boolean => {
  const taskType = pipelineRun?.runtime_config?.parameters?.task_type ?? TASK_TYPE_TIMESERIES;

  return [TASK_TYPE_BINARY, TASK_TYPE_MULTICLASS, TASK_TYPE_REGRESSION].includes(taskType);
};

/**
 * Format metric keys from snake_case to a human-readable label.
 * Handles common ML acronyms as special cases.
 */
/* eslint-disable camelcase */
const METRIC_DISPLAY_NAMES: Record<string, string> = {
  f1: 'F₁',
  mae: 'MAE',
  mape: 'MAPE',
  mase: 'MASE',
  mcc: 'MCC',
  mse: 'MSE',
  r2: 'R²',
  rmse: 'RMSE',
  rmsle: 'RMSLE',
  rmsse: 'RMSSE',
  roc_auc: 'ROC AUC',
  smape: 'SMAPE',
  sql: 'SQL',
  wape: 'WAPE',
  wql: 'WQL',
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
      return 'mase';
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

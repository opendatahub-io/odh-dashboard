/**
 * Format metric keys from snake_case to a human-readable label.
 * Handles common ML acronyms as special cases.
 */
/* eslint-disable camelcase */
const METRIC_DISPLAY_NAMES: Record<string, string> = {
  roc_auc: 'ROC AUC',
  mcc: 'MCC',
  f1: 'F1',
  r2: 'R²',
  mae: 'MAE',
  mse: 'MSE',
  rmse: 'RMSE',
  mape: 'MAPE',
  smape: 'SMAPE',
};
/* eslint-enable camelcase */

export function formatMetricName(key: string): string {
  if (METRIC_DISPLAY_NAMES[key]) {
    return METRIC_DISPLAY_NAMES[key];
  }
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
 * Returns the default optimized metric for a given task type.
 */
export function getOptimizedMetricForTask(taskType: string): string | undefined {
  switch (taskType) {
    case 'binary':
    case 'multiclass':
      return 'accuracy';
    case 'regression':
      return 'r2';
    case 'timeseries':
      return 'smape';
    default:
      return undefined;
  }
}

/** Metrics where lower values indicate better performance. */
const ERROR_METRICS = new Set(['smape', 'mse', 'mae', 'rmse', 'mape']);

/**
 * Check whether a metric is an error metric (lower-is-better).
 * AutoGluon reports these as negative values; callers should use Math.abs()
 * only for these metrics to recover the true value.
 */
export function isErrorMetric(metric: string): boolean {
  return ERROR_METRICS.has(metric.toLowerCase());
}

/**
 * Build a mapping from model name → leaderboard rank (1-based).
 * Ranks are assigned by sorting on the optimized metric for the task type,
 */
export function computeRankMap(
  models: Record<string, { metrics: { test_data?: Record<string, unknown> } }>,
  taskType: string,
): Record<string, number> {
  const optimizedMetric = getOptimizedMetricForTask(taskType) ?? 'accuracy';
  const useAbs = isErrorMetric(optimizedMetric);

  // Use worst-case for missing metrics so they sort last
  const worstCase = useAbs ? Infinity : -Infinity;

  const sorted = Object.keys(models).toSorted((a, b) => {
    const aMetric = models[a].metrics.test_data?.[optimizedMetric];
    const bMetric = models[b].metrics.test_data?.[optimizedMetric];
    const aVal =
      aMetric != null
        ? useAbs
          ? Math.abs(toNumericMetric(aMetric))
          : toNumericMetric(aMetric)
        : worstCase;
    const bVal =
      bMetric != null
        ? useAbs
          ? Math.abs(toNumericMetric(bMetric))
          : toNumericMetric(bMetric)
        : worstCase;
    return useAbs ? aVal - bVal : bVal - aVal;
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

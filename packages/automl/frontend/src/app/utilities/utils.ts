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

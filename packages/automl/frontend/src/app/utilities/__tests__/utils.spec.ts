/* eslint-disable camelcase */
import {
  isRunTerminatable,
  isRunInProgress,
  isRunRetryable,
  isRunDeletable,
  formatMetricName,
  formatMetricValue,
  toNumericMetric,
  getOptimizedMetricForTask,
  computeRankMap,
} from '~/app/utilities/utils';

describe('isRunTerminatable', () => {
  it('should return true for active states', () => {
    expect(isRunTerminatable('RUNNING')).toBe(true);
    expect(isRunTerminatable('PENDING')).toBe(true);
    expect(isRunTerminatable('PAUSED')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isRunTerminatable('running')).toBe(true);
    expect(isRunTerminatable('Running')).toBe(true);
    expect(isRunTerminatable('pending')).toBe(true);
  });

  it('should return false for terminal states', () => {
    expect(isRunTerminatable('SUCCEEDED')).toBe(false);
    expect(isRunTerminatable('FAILED')).toBe(false);
    expect(isRunTerminatable('CANCELED')).toBe(false);
    expect(isRunTerminatable('CANCELING')).toBe(false);
  });

  it('should return false for undefined or empty state', () => {
    expect(isRunTerminatable(undefined)).toBe(false);
    expect(isRunTerminatable('')).toBe(false);
  });
});

describe('isRunInProgress', () => {
  it('should return true for in-progress states including CANCELING', () => {
    expect(isRunInProgress('RUNNING')).toBe(true);
    expect(isRunInProgress('PENDING')).toBe(true);
    expect(isRunInProgress('CANCELING')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isRunInProgress('running')).toBe(true);
    expect(isRunInProgress('canceling')).toBe(true);
  });

  it('should return false for terminal and non-active states', () => {
    expect(isRunInProgress('SUCCEEDED')).toBe(false);
    expect(isRunInProgress('FAILED')).toBe(false);
    expect(isRunInProgress('CANCELED')).toBe(false);
    expect(isRunInProgress('PAUSED')).toBe(false);
  });

  it('should return false for undefined or empty state', () => {
    expect(isRunInProgress(undefined)).toBe(false);
    expect(isRunInProgress('')).toBe(false);
  });
});

describe('isRunRetryable', () => {
  it('should return true for retryable states', () => {
    expect(isRunRetryable('FAILED')).toBe(true);
    expect(isRunRetryable('CANCELED')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isRunRetryable('failed')).toBe(true);
    expect(isRunRetryable('Failed')).toBe(true);
    expect(isRunRetryable('canceled')).toBe(true);
  });

  it('should return false for non-retryable states', () => {
    expect(isRunRetryable('RUNNING')).toBe(false);
    expect(isRunRetryable('SUCCEEDED')).toBe(false);
    expect(isRunRetryable('PENDING')).toBe(false);
  });

  it('should return false for undefined or empty state', () => {
    expect(isRunRetryable(undefined)).toBe(false);
    expect(isRunRetryable('')).toBe(false);
  });
});

describe('isRunDeletable', () => {
  it('should return true for terminal states', () => {
    expect(isRunDeletable('SUCCEEDED')).toBe(true);
    expect(isRunDeletable('FAILED')).toBe(true);
    expect(isRunDeletable('CANCELED')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isRunDeletable('succeeded')).toBe(true);
    expect(isRunDeletable('Succeeded')).toBe(true);
    expect(isRunDeletable('failed')).toBe(true);
    expect(isRunDeletable('canceled')).toBe(true);
  });

  it('should return false for active states', () => {
    expect(isRunDeletable('RUNNING')).toBe(false);
    expect(isRunDeletable('PENDING')).toBe(false);
    expect(isRunDeletable('PAUSED')).toBe(false);
    expect(isRunDeletable('CANCELING')).toBe(false);
  });

  it('should return false for undefined or empty state', () => {
    expect(isRunDeletable(undefined)).toBe(false);
    expect(isRunDeletable('')).toBe(false);
  });
});

describe('formatMetricName', () => {
  it('should return special-cased acronyms as-is', () => {
    expect(formatMetricName('roc_auc')).toBe('ROC AUC');
    expect(formatMetricName('mcc')).toBe('MCC');
    expect(formatMetricName('f1')).toBe('F₁');
    expect(formatMetricName('r2')).toBe('R²');
    expect(formatMetricName('mean_absolute_error')).toBe('MAE');
    expect(formatMetricName('mean_squared_error')).toBe('MSE');
    expect(formatMetricName('root_mean_squared_error')).toBe('RMSE');
    expect(formatMetricName('mean_absolute_percentage_error')).toBe('MAPE');
    expect(formatMetricName('mean_absolute_scaled_error')).toBe('MASE');
    expect(formatMetricName('symmetric_mean_absolute_percentage_error')).toBe('SMAPE');
    expect(formatMetricName('root_mean_squared_logarithmic_error')).toBe('RMSLE');
    expect(formatMetricName('root_mean_squared_scaled_error')).toBe('RMSSE');
    expect(formatMetricName('weighted_absolute_percentage_error')).toBe('WAPE');
    expect(formatMetricName('weighted_quantile_loss')).toBe('WQL');
    expect(formatMetricName('scaled_quantile_loss')).toBe('SQL');
  });

  it('should convert snake_case to Title Case', () => {
    expect(formatMetricName('balanced_accuracy')).toBe('Balanced Accuracy');
    expect(formatMetricName('some_unknown_metric')).toBe('Some Unknown Metric');
  });

  it('should title-case a single-word key not in the display names map', () => {
    expect(formatMetricName('accuracy')).toBe('Accuracy');
    expect(formatMetricName('precision')).toBe('Precision');
  });

  it('should handle empty string', () => {
    expect(formatMetricName('')).toBe('');
  });
});

describe('formatMetricValue', () => {
  it('should format normal values with 3 decimal places', () => {
    expect(formatMetricValue(0.12345)).toBe('0.123');
    expect(formatMetricValue(0.8)).toBe('0.800');
    expect(formatMetricValue(1.5678)).toBe('1.568');
  });

  it('should use scientific notation for non-zero values that round to 0.000', () => {
    expect(formatMetricValue(0.0001)).toBe('1.000e-4');
    expect(formatMetricValue(0.00001234)).toBe('1.234e-5');
    expect(formatMetricValue(0.0000001)).toBe('1.000e-7');
  });

  it('should display zero as 0.000 (not scientific notation)', () => {
    expect(formatMetricValue(0)).toBe('0.000');
  });

  it('should use scientific notation for negative non-zero values that round to -0.000', () => {
    expect(formatMetricValue(-0.0001)).toBe('-1.000e-4');
    expect(formatMetricValue(-0.00001234)).toBe('-1.234e-5');
  });

  it('should format negative values normally if they do not round to -0.000', () => {
    expect(formatMetricValue(-0.123)).toBe('-0.123');
    expect(formatMetricValue(-1.5678)).toBe('-1.568');
  });

  it('should return string values as-is', () => {
    expect(formatMetricValue('N/A')).toBe('N/A');
    expect(formatMetricValue('invalid')).toBe('invalid');
  });
});

describe('toNumericMetric', () => {
  it('should return number values as-is', () => {
    expect(toNumericMetric(0.85)).toBe(0.85);
    expect(toNumericMetric(-0.123)).toBe(-0.123);
    expect(toNumericMetric(0)).toBe(0);
  });

  it('should parse numeric strings', () => {
    expect(toNumericMetric('0.85')).toBe(0.85);
    expect(toNumericMetric('-0.123')).toBe(-0.123);
    expect(toNumericMetric('42')).toBe(42);
  });

  it('should return 0 for non-numeric strings', () => {
    expect(toNumericMetric('not-a-number')).toBe(0);
    expect(toNumericMetric('')).toBe(0);
  });

  it('should return 0 for null, undefined, and other types', () => {
    expect(toNumericMetric(null)).toBe(0);
    expect(toNumericMetric(undefined)).toBe(0);
    expect(toNumericMetric(true)).toBe(0);
    expect(toNumericMetric({})).toBe(0);
    expect(toNumericMetric([])).toBe(0);
  });
});

describe('getOptimizedMetricForTask', () => {
  it('should return accuracy for binary and multiclass', () => {
    expect(getOptimizedMetricForTask('binary')).toBe('accuracy');
    expect(getOptimizedMetricForTask('multiclass')).toBe('accuracy');
  });

  it('should return r2 for regression', () => {
    expect(getOptimizedMetricForTask('regression')).toBe('r2');
  });

  it('should return mean_absolute_scaled_error for timeseries', () => {
    expect(getOptimizedMetricForTask('timeseries')).toBe('mean_absolute_scaled_error');
  });

  it('should return Unknown metric for unknown task types', () => {
    expect(getOptimizedMetricForTask('unknown')).toBe('Unknown metric');
    expect(getOptimizedMetricForTask('')).toBe('Unknown metric');
  });
});

describe('computeRankMap', () => {
  const buildModel = (metricValue: number, metricName = 'accuracy') => ({
    // eslint-disable-next-line camelcase
    metrics: { test_data: { [metricName]: metricValue } },
  });

  it('should rank models by accuracy descending for classification tasks', () => {
    const models = {
      ModelA: buildModel(0.75),
      ModelB: buildModel(0.9),
      ModelC: buildModel(0.82),
    };

    const rankMap = computeRankMap(models, 'multiclass');

    expect(rankMap).toEqual({
      ModelB: 1,
      ModelC: 2,
      ModelA: 3,
    });
  });

  it('should rank models by r2 descending for regression (higher is better)', () => {
    const models = {
      ModelA: buildModel(0.084, 'r2'),
      ModelB: buildModel(0.325, 'r2'),
      ModelC: buildModel(0.19, 'r2'),
    };

    const rankMap = computeRankMap(models, 'regression');

    expect(rankMap).toEqual({
      ModelB: 1,
      ModelC: 2,
      ModelA: 3,
    });
  });

  it('should rank models by negated mean_absolute_scaled_error descending for timeseries (higher is better)', () => {
    const models = {
      ModelA: buildModel(-0.15, 'mean_absolute_scaled_error'),
      ModelB: buildModel(-0.05, 'mean_absolute_scaled_error'),
      ModelC: buildModel(-0.1, 'mean_absolute_scaled_error'),
    };

    const rankMap = computeRankMap(models, 'timeseries');

    // -0.05 > -0.10 > -0.15, so ModelB (closest to 0) is best
    expect(rankMap).toEqual({
      ModelB: 1,
      ModelC: 2,
      ModelA: 3,
    });
  });

  it('should rank by raw value for non-error metrics like r2', () => {
    const models = {
      ModelA: buildModel(-0.097, 'r2'),
      ModelB: buildModel(-0.084, 'r2'),
    };

    const rankMap = computeRankMap(models, 'regression');

    // -0.084 > -0.097, so ModelB is better
    expect(rankMap).toEqual({
      ModelB: 1,
      ModelA: 2,
    });
  });

  it('should handle a single model', () => {
    const models = {
      OnlyModel: buildModel(0.95),
    };

    const rankMap = computeRankMap(models, 'binary');

    expect(rankMap).toEqual({ OnlyModel: 1 });
  });

  it('should handle empty models', () => {
    const rankMap = computeRankMap({}, 'binary');
    expect(rankMap).toEqual({});
  });

  it('should rank models with missing metrics last for higher-is-better metrics', () => {
    const models = {
      ModelA: buildModel(0.85),
      ModelB: { metrics: { test_data: {} } }, // missing accuracy
      ModelC: buildModel(0.7),
    };

    const rankMap = computeRankMap(models, 'binary');

    expect(rankMap).toEqual({
      ModelA: 1,
      ModelC: 2,
      ModelB: 3,
    });
  });

  it('should rank models with missing metrics last for negated error metrics', () => {
    const models = {
      ModelA: buildModel(-0.15, 'mean_absolute_scaled_error'),
      ModelB: { metrics: { test_data: {} } }, // missing mean_absolute_scaled_error
      ModelC: buildModel(-0.05, 'mean_absolute_scaled_error'),
    };

    const rankMap = computeRankMap(models, 'timeseries');

    // -0.05 > -0.15 > -Infinity (missing), so ModelC is best
    expect(rankMap).toEqual({
      ModelC: 1,
      ModelA: 2,
      ModelB: 3,
    });
  });

  it('should rank models with undefined test_data last', () => {
    const models = {
      ModelA: buildModel(0.9),
      ModelB: { metrics: {} }, // undefined test_data
    };

    const rankMap = computeRankMap(models, 'binary');

    expect(rankMap).toEqual({
      ModelA: 1,
      ModelB: 2,
    });
  });

  it('should assign insertion-order ranking for unknown task types', () => {
    const models = {
      ModelA: buildModel(0.7),
      ModelB: buildModel(0.85),
    };

    // Unknown task types map to 'Unknown metric', which no model has,
    // so all models tie and receive insertion-order ranking.
    const rankMap = computeRankMap(models, 'unknown');

    expect(rankMap).toEqual({
      ModelA: 1,
      ModelB: 2,
    });
  });
});

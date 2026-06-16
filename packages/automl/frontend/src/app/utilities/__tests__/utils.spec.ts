/* eslint-disable camelcase */
import {
  isRunCompleted,
  isRunInTerminalState,
  isRunTerminatable,
  isRunInProgress,
  isRunRetryable,
  isRunDeletable,
  formatMetricName,
  formatMetricValue,
  toNumericMetric,
  normalizeMetricKey,
  getOptimizedMetricForTask,
  resolveEvalMetric,
  computeRankMap,
  findEquivalentMetric,
  generateReconfigureName,
} from '~/app/utilities/utils';

describe('isRunCompleted', () => {
  it('should return true for SUCCEEDED', () => {
    expect(isRunCompleted('SUCCEEDED')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isRunCompleted('succeeded')).toBe(true);
    expect(isRunCompleted('Succeeded')).toBe(true);
  });

  it('should return false for other terminal states', () => {
    expect(isRunCompleted('FAILED')).toBe(false);
    expect(isRunCompleted('CANCELED')).toBe(false);
    expect(isRunCompleted('SKIPPED')).toBe(false);
    expect(isRunCompleted('CACHED')).toBe(false);
  });

  it('should return false for active states', () => {
    expect(isRunCompleted('RUNNING')).toBe(false);
    expect(isRunCompleted('PENDING')).toBe(false);
  });

  it('should return false for undefined or empty state', () => {
    expect(isRunCompleted(undefined)).toBe(false);
    expect(isRunCompleted('')).toBe(false);
  });
});

describe('isRunInTerminalState', () => {
  it('should return true for all terminal states', () => {
    expect(isRunInTerminalState('SUCCEEDED')).toBe(true);
    expect(isRunInTerminalState('FAILED')).toBe(true);
    expect(isRunInTerminalState('CANCELED')).toBe(true);
    expect(isRunInTerminalState('SKIPPED')).toBe(true);
    expect(isRunInTerminalState('CACHED')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isRunInTerminalState('succeeded')).toBe(true);
    expect(isRunInTerminalState('Failed')).toBe(true);
    expect(isRunInTerminalState('canceled')).toBe(true);
  });

  it('should return false for active states', () => {
    expect(isRunInTerminalState('RUNNING')).toBe(false);
    expect(isRunInTerminalState('PENDING')).toBe(false);
    expect(isRunInTerminalState('PAUSED')).toBe(false);
    expect(isRunInTerminalState('CANCELING')).toBe(false);
  });

  it('should return false for undefined or empty state', () => {
    expect(isRunInTerminalState(undefined)).toBe(false);
    expect(isRunInTerminalState('')).toBe(false);
  });
});

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

describe('normalizeMetricKey', () => {
  it('should normalize uppercase timeseries aliases to snake_case', () => {
    expect(normalizeMetricKey('MASE')).toBe('mean_absolute_scaled_error');
    expect(normalizeMetricKey('RMSE')).toBe('root_mean_squared_error');
    expect(normalizeMetricKey('MAE')).toBe('mean_absolute_error');
  });

  it('should normalize lowercase timeseries keys via toUpperCase lookup', () => {
    expect(normalizeMetricKey('mase')).toBe('mean_absolute_scaled_error');
    expect(normalizeMetricKey('rmse')).toBe('root_mean_squared_error');
  });

  it('should pass through tabular metrics unchanged', () => {
    expect(normalizeMetricKey('accuracy')).toBe('accuracy');
    expect(normalizeMetricKey('f1')).toBe('f1');
    expect(normalizeMetricKey('r2')).toBe('r2');
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

describe('resolveEvalMetric', () => {
  it('should normalize and return the provided eval metric', () => {
    expect(resolveEvalMetric('MSE', 'regression')).toBe('mean_squared_error');
  });

  it('should fall back to the task-type default when eval metric is undefined', () => {
    expect(resolveEvalMetric(undefined, 'binary')).toBe('accuracy');
    expect(resolveEvalMetric(undefined, 'regression')).toBe('r2');
  });

  it('should fall back to the task-type default when eval metric is empty', () => {
    expect(resolveEvalMetric('', 'binary')).toBe('accuracy');
  });
});

describe('findEquivalentMetric', () => {
  it('should return the same metric when it exists in the target task type', () => {
    expect(findEquivalentMetric('accuracy', 'binary')).toBe('accuracy');
    expect(findEquivalentMetric('r2', 'regression')).toBe('r2');
    expect(findEquivalentMetric('MASE', 'timeseries')).toBe('MASE');
  });

  it('should return undefined for metrics not supported by the target task type', () => {
    expect(findEquivalentMetric('accuracy', 'regression')).toBeUndefined();
    expect(findEquivalentMetric('r2', 'binary')).toBeUndefined();
  });

  it('should cast regression snake_case to timeseries acronym', () => {
    expect(findEquivalentMetric('mean_absolute_error', 'timeseries')).toBe('MAE');
    expect(findEquivalentMetric('mean_squared_error', 'timeseries')).toBe('MSE');
    expect(findEquivalentMetric('root_mean_squared_error', 'timeseries')).toBe('RMSE');
    expect(findEquivalentMetric('symmetric_mean_absolute_percentage_error', 'timeseries')).toBe(
      'SMAPE',
    );
  });

  it('should cast timeseries acronym to regression snake_case', () => {
    expect(findEquivalentMetric('MAE', 'regression')).toBe('mean_absolute_error');
    expect(findEquivalentMetric('MSE', 'regression')).toBe('mean_squared_error');
    expect(findEquivalentMetric('RMSE', 'regression')).toBe('root_mean_squared_error');
    expect(findEquivalentMetric('SMAPE', 'regression')).toBe(
      'symmetric_mean_absolute_percentage_error',
    );
  });

  it('should return undefined for timeseries-only metrics against regression', () => {
    expect(findEquivalentMetric('MASE', 'regression')).toBeUndefined();
    expect(findEquivalentMetric('SQL', 'regression')).toBeUndefined();
    expect(findEquivalentMetric('WQL', 'regression')).toBeUndefined();
  });

  it('should return undefined when metric is undefined', () => {
    expect(findEquivalentMetric(undefined, 'regression')).toBeUndefined();
  });

  it('should return undefined for unknown task type', () => {
    expect(findEquivalentMetric('accuracy', 'unknown')).toBeUndefined();
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

  it('should use evalMetric override instead of task-type default', () => {
    const models = {
      ModelA: buildModel(0.75),
      ModelB: buildModel(0.9),
    };
    // Both models have accuracy but we rank by f1 via override
    const modelsWithF1 = {
      ModelA: { metrics: { test_data: { accuracy: 0.75, f1: 0.88 } } },
      ModelB: { metrics: { test_data: { accuracy: 0.9, f1: 0.82 } } },
    };

    // Without override: ranks by accuracy (task default)
    expect(computeRankMap(models, 'binary')).toEqual({ ModelB: 1, ModelA: 2 });

    // With override: ranks by f1
    expect(computeRankMap(modelsWithF1, 'binary', 'f1')).toEqual({ ModelA: 1, ModelB: 2 });
  });

  it('should normalize evalMetric override for timeseries', () => {
    const models = {
      ModelA: { metrics: { test_data: { mean_absolute_scaled_error: -0.15 } } },
      ModelB: { metrics: { test_data: { mean_absolute_scaled_error: -0.05 } } },
    };

    // 'MASE' normalizes to 'mean_absolute_scaled_error'
    expect(computeRankMap(models, 'timeseries', 'MASE')).toEqual({ ModelB: 1, ModelA: 2 });
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

describe('generateReconfigureName', () => {
  it('should append " - 1" to a name without a suffix', () => {
    expect(generateReconfigureName('my-run')).toBe('my-run - 1');
  });

  it('should increment an existing numeric suffix', () => {
    expect(generateReconfigureName('my-run - 1')).toBe('my-run - 2');
  });

  it('should handle multiple increments', () => {
    expect(generateReconfigureName('my-run - 99')).toBe('my-run - 100');
  });

  it('should handle a name that ends with a number but not the suffix pattern', () => {
    expect(generateReconfigureName('experiment-42')).toBe('experiment-42 - 1');
  });

  it('should handle an empty string', () => {
    expect(generateReconfigureName('')).toBe(' - 1');
  });

  it('should handle a name with spaces and a suffix', () => {
    expect(generateReconfigureName('my experiment run - 5')).toBe('my experiment run - 6');
  });

  it('should not truncate a name that fits exactly at the 250-char limit', () => {
    // " - 1" is 4 chars, so a 246-char base + " - 1" = 250 total
    const base = 'a'.repeat(246);
    const result = generateReconfigureName(base);
    expect(result).toBe(`${base} - 1`);
    expect(Array.from(result).length).toBe(250);
  });

  it('should truncate and add ellipsis when the result would exceed 250 chars', () => {
    // 248-char base + " - 1" (4 chars) = 252, exceeds 250
    const base = 'a'.repeat(248);
    const result = generateReconfigureName(base);
    // max base = 250 - 4 (" - 1") - 3 ("...") = 243
    expect(result).toBe(`${'a'.repeat(243)}... - 1`);
    expect(Array.from(result).length).toBe(250);
  });

  it('should truncate when incrementing a suffix would exceed the limit', () => {
    // Build a name that is exactly 250 chars: base(245) + " - 9" (4) + " - 1" → nope
    // Let's make: base(244) + " - 99" = 249 chars. Incrementing → base(244) + " - 100" = 250.
    const base = 'b'.repeat(244);
    const original = `${base} - 99`;
    expect(Array.from(original).length).toBe(249);
    const result = generateReconfigureName(original);
    // " - 100" is 6 chars, base(244) + " - 100" = 250 → fits
    expect(result).toBe(`${base} - 100`);
    expect(Array.from(result).length).toBe(250);
  });

  it('should truncate when incrementing from 2 to 3 digit suffix pushes past the limit', () => {
    // base(245) + " - 99" = 250 chars. Incrementing → base(245) + " - 100" = 251 → truncate
    const base = 'c'.repeat(245);
    const original = `${base} - 99`;
    expect(Array.from(original).length).toBe(250);
    const result = generateReconfigureName(original);
    // suffix " - 100" is 6 chars, max base = 250 - 6 - 3 = 241
    expect(result).toBe(`${'c'.repeat(241)}... - 100`);
    expect(Array.from(result).length).toBe(250);
  });

  it('should handle truncation with multi-byte unicode characters', () => {
    // Each emoji is 1 code point but multiple UTF-16 code units
    const base = '\u{1F600}'.repeat(248); // 248 code points of emoji
    const result = generateReconfigureName(base);
    // " - 1" is 4 chars, "..." is 3, max base = 250 - 4 - 3 = 243 code points
    expect(result).toBe(`${'\u{1F600}'.repeat(243)}... - 1`);
    expect(Array.from(result).length).toBe(250);
  });

  it('should correctly increment very large suffix numbers beyond Number.MAX_SAFE_INTEGER', () => {
    const bigNum = '9999999999999999999999999999999999';
    const expected = '10000000000000000000000000000000000';
    const result = generateReconfigureName(`run - ${bigNum}`);
    expect(result).toBe(`run - ${expected}`);
  });

  it('should truncate when a very large suffix number causes overflow', () => {
    // base(210) + " - " + 34-digit number = 247 chars, fits.
    // After increment the number grows to 35 digits → 248, still fits.
    // But with a 246-char base + " - " + 35-digit number = 284 → truncate.
    const bigNum = '9999999999999999999999999999999999'; // 34 digits
    const expected = '10000000000000000000000000000000000'; // 35 digits
    const base = 'x'.repeat(246);
    const result = generateReconfigureName(`${base} - ${bigNum}`);
    // suffix " - 10000000000000000000000000000000000" is 38 chars
    // max base = 250 - 38 - 3 = 209
    expect(result).toBe(`${'x'.repeat(209)}... - ${expected}`);
    expect(Array.from(result).length).toBe(250);
  });

  it('should cap result at 250 chars even when suffix alone is extremely long', () => {
    // Pathological case: suffix so long that "..." + suffix > 250
    const hugeNum = '1'.repeat(260); // 260-digit number
    const result = generateReconfigureName(`run - ${hugeNum}`);
    expect(Array.from(result).length).toBeLessThanOrEqual(250);
  });
});

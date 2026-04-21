/* eslint-disable camelcase */
import {
  formatMetricName,
  formatMetricValue,
  toNumericMetric,
  getOptimizedMetricForTask,
  computeRankMap,
} from '~/app/utilities/utils';

describe('formatMetricName', () => {
  it('should return special-cased acronyms as-is', () => {
    expect(formatMetricName('roc_auc')).toBe('ROC AUC');
    expect(formatMetricName('mcc')).toBe('MCC');
    expect(formatMetricName('f1')).toBe('F₁');
    expect(formatMetricName('r2')).toBe('R²');
    expect(formatMetricName('mae')).toBe('MAE');
    expect(formatMetricName('mse')).toBe('MSE');
    expect(formatMetricName('rmse')).toBe('RMSE');
    expect(formatMetricName('mape')).toBe('MAPE');
    expect(formatMetricName('mase')).toBe('MASE');
    expect(formatMetricName('smape')).toBe('SMAPE');
  });

  it('should convert snake_case to Title Case', () => {
    expect(formatMetricName('balanced_accuracy')).toBe('Balanced Accuracy');
    expect(formatMetricName('root_mean_squared_error')).toBe('Root Mean Squared Error');
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

  it('should return mase for timeseries', () => {
    expect(getOptimizedMetricForTask('timeseries')).toBe('mase');
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

  it('should rank models by negated mase descending for timeseries (higher is better)', () => {
    const models = {
      ModelA: buildModel(-0.15, 'mase'),
      ModelB: buildModel(-0.05, 'mase'),
      ModelC: buildModel(-0.1, 'mase'),
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
      ModelA: buildModel(-0.15, 'mase'),
      ModelB: { metrics: { test_data: {} } }, // missing mase
      ModelC: buildModel(-0.05, 'mase'),
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

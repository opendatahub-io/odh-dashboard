/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import {
  buildPRCurveLines,
  getApValue,
  getBaselinePrecision,
} from '~/app/components/run-results/AutomlModelDetailsModal/components/PrecisionRecallChart';
import type { CurvesData } from '~/app/types';

const binaryData: CurvesData = {
  task_type: 'binary',
  positive_class: 1,
  num_samples: 100,
  num_positive: 50,
  num_negative: 50,
  roc_curve: {
    auc: 0.95,
    fpr: [0.0, 0.1, 0.5, 1.0],
    tpr: [0.0, 0.6, 0.9, 1.0],
    thresholds: ['inf', 0.9, 0.5, 0.1],
  },
  precision_recall_curve: {
    average_precision: 0.95,
    precision: [0.5, 0.7, 0.9, 1.0],
    recall: [1.0, 0.8, 0.5, 0.0],
    thresholds: [0.2, 0.5, 0.8],
    baseline_precision: 0.5,
  },
};

const multiclassData: CurvesData = {
  task_type: 'multiclass',
  strategy: 'ovr',
  num_classes: 2,
  classes: ['A', 'B'],
  num_samples: 100,
  roc_curve: {
    auc_macro: 0.85,
    auc_weighted: 0.86,
    per_class: {
      A: {
        auc: 0.9,
        fpr: [0.0, 0.2, 1.0],
        tpr: [0.0, 0.8, 1.0],
        thresholds: ['inf', 0.7, 0.1],
        support: 50,
      },
      B: {
        auc: 0.8,
        fpr: [0.0, 0.3, 1.0],
        tpr: [0.0, 0.7, 1.0],
        thresholds: ['inf', 0.6, 0.1],
        support: 50,
      },
    },
  },
  precision_recall_curve: {
    average_precision_macro: 0.85,
    average_precision_weighted: 0.86,
    per_class: {
      A: {
        average_precision: 0.9,
        precision: [0.4, 0.7, 1.0],
        recall: [1.0, 0.6, 0.0],
        thresholds: [0.3, 0.7],
        baseline_precision: 0.4,
      },
      B: {
        average_precision: 0.8,
        precision: [0.3, 0.6, 1.0],
        recall: [1.0, 0.5, 0.0],
        thresholds: [0.4, 0.8],
        baseline_precision: 0.3,
      },
    },
  },
};

describe('buildPRCurveLines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should produce a single curve for binary data', () => {
    const lines = buildPRCurveLines(binaryData);
    expect(lines).toHaveLength(1);
    expect(lines[0].label).toBe('Model');
    expect(lines[0].ap).toBe(0.95);
    expect(lines[0].points).toHaveLength(4);
  });

  it('should map binary recall to x and precision to y', () => {
    const lines = buildPRCurveLines(binaryData);
    expect(lines[0].points[0]).toEqual({
      name: 'Model',
      x: 1.0,
      y: 0.5,
      index: 0,
    });
    expect(lines[0].points[1]).toEqual({
      name: 'Model',
      x: 0.8,
      y: 0.7,
      index: 0,
    });
  });

  it('should produce one curve per class for multiclass data', () => {
    const lines = buildPRCurveLines(multiclassData);
    expect(lines).toHaveLength(2);
    expect(lines[0].label).toBe('A');
    expect(lines[0].ap).toBe(0.9);
    expect(lines[1].label).toBe('B');
    expect(lines[1].ap).toBe(0.8);
  });

  it('should assign sequential indices to multiclass curves', () => {
    const lines = buildPRCurveLines(multiclassData);
    expect(lines[0].points[0].index).toBe(0);
    expect(lines[1].points[0].index).toBe(1);
  });

  it('should have correct point count matching recall array length', () => {
    const lines = buildPRCurveLines(multiclassData);
    expect(lines[0].points).toHaveLength(3);
    expect(lines[1].points).toHaveLength(3);
  });
});

describe('getBaselinePrecision', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return baseline_precision for binary data', () => {
    expect(getBaselinePrecision(binaryData)).toBe(0.5);
  });

  it('should return averaged baseline_precision for multiclass data', () => {
    // (0.4 + 0.3) / 2 = 0.35
    expect(getBaselinePrecision(multiclassData)).toBeCloseTo(0.35, 10);
  });
});

describe('getApValue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return average_precision for binary data', () => {
    expect(getApValue(binaryData)).toBe(0.95);
  });

  it('should return average_precision_macro for multiclass data', () => {
    expect(getApValue(multiclassData)).toBe(0.85);
  });
});

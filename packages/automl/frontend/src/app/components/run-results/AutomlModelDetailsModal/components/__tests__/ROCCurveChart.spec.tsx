/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { buildCurveLines } from '~/app/components/run-results/AutomlModelDetailsModal/components/ROCCurveChart';
import type { RocCurveData } from '~/app/types';

const binaryData: RocCurveData = {
  task_type: 'binary',
  roc_curve: {
    auc: 0.95,
    fpr: [0.0, 0.1, 0.5, 1.0],
    tpr: [0.0, 0.6, 0.9, 1.0],
    thresholds: ['inf', 0.9, 0.5, 0.1],
  },
};

const multiclassData: RocCurveData = {
  task_type: 'multiclass',
  classes: ['A', 'B'],
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
};

describe('buildCurveLines', () => {
  it('should produce a single curve for binary data', () => {
    const lines = buildCurveLines(binaryData);
    expect(lines).toHaveLength(1);
    expect(lines[0].label).toBe('ROC');
    expect(lines[0].auc).toBe(0.95);
    expect(lines[0].points).toHaveLength(4);
  });

  it('should map binary fpr to x and tpr to y', () => {
    const lines = buildCurveLines(binaryData);
    expect(lines[0].points[0]).toEqual({
      name: 'ROC threshold: inf',
      x: 0.0,
      y: 0.0,
      index: 0,
    });
    expect(lines[0].points[1]).toEqual({
      name: 'ROC threshold: 0.9',
      x: 0.1,
      y: 0.6,
      index: 0,
    });
  });

  it('should produce one curve per class plus multi-class for multiclass data', () => {
    const lines = buildCurveLines(multiclassData);
    expect(lines).toHaveLength(3);
    expect(lines[0].label).toBe('A (One v. Rest)');
    expect(lines[0].auc).toBe(0.9);
    expect(lines[1].label).toBe('B (One v. Rest)');
    expect(lines[1].auc).toBe(0.8);
    expect(lines[2].label).toBe('Multi-class');
    expect(lines[2].auc).toBe(0.85);
  });

  it('should assign sequential indices to multiclass curves', () => {
    const lines = buildCurveLines(multiclassData);
    expect(lines[0].points[0].index).toBe(0);
    expect(lines[1].points[0].index).toBe(1);
    expect(lines[2].points[0].index).toBe(2);
  });

  it('should include class name in multiclass point names', () => {
    const lines = buildCurveLines(multiclassData);
    expect(lines[0].points[1].name).toBe('A (One v. Rest) threshold: 0.7');
    expect(lines[1].points[1].name).toBe('B (One v. Rest) threshold: 0.6');
  });

  it('should have correct point count matching fpr array length', () => {
    const lines = buildCurveLines(multiclassData);
    expect(lines[0].points).toHaveLength(3);
    expect(lines[1].points).toHaveLength(3);
  });

  it('should compute macro-average curve with interpolated points', () => {
    const lines = buildCurveLines(multiclassData);
    const macroLine = lines[2];
    expect(macroLine.points).toHaveLength(101);
    expect(macroLine.points[0].x).toBe(0);
    expect(macroLine.points[0].y).toBeCloseTo(0, 1);
    expect(macroLine.points[100].x).toBe(1);
    expect(macroLine.points[100].y).toBeCloseTo(1, 1);
  });
});

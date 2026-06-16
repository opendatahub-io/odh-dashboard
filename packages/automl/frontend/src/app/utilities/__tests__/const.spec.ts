/* eslint-disable camelcase */
import {
  EVAL_METRICS_BINARY,
  EVAL_METRICS_MULTICLASS,
  EVAL_METRICS_CLASSIFICATION,
  EVAL_METRICS_BY_TASK_TYPE,
  TASK_TYPE_BINARY,
  TASK_TYPE_MULTICLASS,
} from '~/app/utilities/const';

/** OVO/OVR metric names that are only valid for multiclass classification. */
const OVO_OVR_METRICS = [
  'roc_auc_ovo',
  'roc_auc_ovo_macro',
  'roc_auc_ovo_weighted',
  'roc_auc_ovr',
  'roc_auc_ovr_macro',
  'roc_auc_ovr_micro',
  'roc_auc_ovr_weighted',
];

describe('EVAL_METRICS_BINARY', () => {
  it('should not contain any OVO/OVR metrics', () => {
    for (const metric of OVO_OVR_METRICS) {
      expect(EVAL_METRICS_BINARY).not.toContain(metric);
    }
  });

  it('should contain core binary-valid metrics', () => {
    const expectedBinaryMetrics = [
      'accuracy',
      'balanced_accuracy',
      'log_loss',
      'f1',
      'f1_macro',
      'f1_micro',
      'f1_weighted',
      'roc_auc',
      'average_precision',
      'precision',
      'precision_macro',
      'precision_micro',
      'precision_weighted',
      'recall',
      'recall_macro',
      'recall_micro',
      'recall_weighted',
      'mcc',
      'pac_score',
    ];
    for (const metric of expectedBinaryMetrics) {
      expect(EVAL_METRICS_BINARY).toContain(metric);
    }
    expect(EVAL_METRICS_BINARY).toHaveLength(expectedBinaryMetrics.length);
  });
});

describe('EVAL_METRICS_MULTICLASS', () => {
  it('should contain all OVO/OVR metrics', () => {
    for (const metric of OVO_OVR_METRICS) {
      expect(EVAL_METRICS_MULTICLASS).toContain(metric);
    }
  });

  it('should contain all binary metrics', () => {
    for (const metric of EVAL_METRICS_BINARY) {
      expect(EVAL_METRICS_MULTICLASS).toContain(metric);
    }
  });

  it('should be a superset of binary metrics', () => {
    expect(EVAL_METRICS_MULTICLASS.length).toBeGreaterThan(EVAL_METRICS_BINARY.length);
  });
});

describe('EVAL_METRICS_CLASSIFICATION', () => {
  it('should equal EVAL_METRICS_MULTICLASS (backward compatibility)', () => {
    expect(EVAL_METRICS_CLASSIFICATION).toEqual(EVAL_METRICS_MULTICLASS);
  });
});

describe('EVAL_METRICS_BY_TASK_TYPE', () => {
  it('should map binary to EVAL_METRICS_BINARY (no OVO/OVR)', () => {
    const binaryMetrics = EVAL_METRICS_BY_TASK_TYPE[TASK_TYPE_BINARY];
    expect(binaryMetrics).toBe(EVAL_METRICS_BINARY);
    for (const metric of OVO_OVR_METRICS) {
      expect(binaryMetrics).not.toContain(metric);
    }
  });

  it('should map multiclass to EVAL_METRICS_MULTICLASS (includes OVO/OVR)', () => {
    const multiclassMetrics = EVAL_METRICS_BY_TASK_TYPE[TASK_TYPE_MULTICLASS];
    expect(multiclassMetrics).toBe(EVAL_METRICS_MULTICLASS);
    for (const metric of OVO_OVR_METRICS) {
      expect(multiclassMetrics).toContain(metric);
    }
  });
});

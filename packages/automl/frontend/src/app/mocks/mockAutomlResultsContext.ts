/* eslint-disable camelcase */
import type {
  BackTestingData,
  FeatureImportanceData,
  ConfusionMatrixData,
  CurvesData,
  PipelineRun,
} from '~/app/types';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';

type TabularParameters = {
  task_type: 'binary' | 'multiclass' | 'regression';
  label_column: string;
  [key: string]: unknown;
};

type TimeseriesParameters = {
  task_type: 'timeseries';
  target: string;
  id_column: string;
  timestamp_column: string;
  prediction_length?: number;
  [key: string]: unknown;
};

export type MockAutomlParameters = TabularParameters | TimeseriesParameters;

export type MockAutomlResultsContext = {
  pipelineRun: PipelineRun;
  pipelineRunLoading: boolean;
  models: Record<string, AutomlModel>;
  modelsLoading: boolean;
  parameters: MockAutomlParameters;
};

// ---------------------------------------------------------------------------
// Helper — builds the full S3 path for a model
// ---------------------------------------------------------------------------

const buildLocation = (
  pipelineName: string,
  runId: string,
  taskId: string,
  modelName: string,
): AutomlModel['location'] => {
  const base = `${pipelineName}/${runId}/autogluon-models-training/${taskId}/models_artifact/${modelName}`;
  return {
    model_directory: `${base}/`,
    predictor: `${base}/predictor`,
    notebook: `${base}/notebooks/automl_predictor_notebook.ipynb`,
  };
};

// ---------------------------------------------------------------------------
// Mock pipeline run
// ---------------------------------------------------------------------------

const mockPipelineRun: PipelineRun = {
  run_id: 'a1b2c3d4-5678-9abc-def0-1234567890ab',
  display_name: 'multiclass-1773928500000',
  experiment_id: 'e1f2a3b4-c5d6-7890-abcd-ef0123456789',
  state: 'SUCCEEDED',
  storage_state: 'AVAILABLE',
  created_at: '2026-03-19T14:00:00Z',
  finished_at: '2026-03-19T19:30:00Z',
  runtime_config: {
    parameters: {
      display_name: 'test-run',
      label_column: 'type',
      task_type: 'multiclass',
      preset: 'speed',
      eval_metric: 'accuracy',
      top_n: 3,
      train_data_bucket_name: 'my-automl-bucket',
      train_data_file_key: 'creatures_dataset.csv',
      train_data_secret_name: 's3-with-bucket',
    },
  },
};

// ---------------------------------------------------------------------------
// Mock models
// ---------------------------------------------------------------------------

const RUN_ID = mockPipelineRun.run_id;
const TASK_ID = '22ab3456-7890-cdef-1234-567890abcdef';

const mockModels: Record<string, AutomlModel> = {
  CatBoost_BAG_L2_FULL: {
    name: 'CatBoost_BAG_L2_FULL',
    location: buildLocation(
      'autogluon-tabular-training-pipeline',
      RUN_ID,
      TASK_ID,
      'CatBoost_BAG_L2_FULL',
    ),
    metrics: {
      test_data: {
        accuracy: 0.658,
        balanced_accuracy: 0.662,
        mcc: 0.487,
        f1: 0.648,
        precision: 0.65,
        recall: 0.662,
      },
    },
  },
  RandomForest_BAG_L1_FULL: {
    name: 'RandomForest_BAG_L1_FULL',
    location: buildLocation(
      'autogluon-tabular-training-pipeline',
      RUN_ID,
      TASK_ID,
      'RandomForest_BAG_L1_FULL',
    ),
    metrics: {
      test_data: {
        accuracy: 0.632,
        balanced_accuracy: 0.635,
        mcc: 0.448,
        f1: 0.621,
        precision: 0.628,
        recall: 0.635,
      },
    },
  },
  NeuralNet_BAG_L1_FULL: {
    name: 'NeuralNet_BAG_L1_FULL',
    location: buildLocation(
      'autogluon-tabular-training-pipeline',
      RUN_ID,
      TASK_ID,
      'NeuralNet_BAG_L1_FULL',
    ),
    metrics: {
      test_data: {
        accuracy: 0.605,
        balanced_accuracy: 0.61,
        mcc: 0.408,
        f1: 0.598,
        precision: 0.603,
        recall: 0.61,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Mock context
// ---------------------------------------------------------------------------

export const mockTabularContext: MockAutomlResultsContext = {
  pipelineRun: mockPipelineRun,
  pipelineRunLoading: false,
  models: mockModels,
  modelsLoading: false,
  parameters: {
    label_column: 'type',
    task_type: 'multiclass',
    top_n: 3,
    train_data_bucket_name: 'my-automl-bucket',
    train_data_file_key: 'creatures_dataset.csv',
    train_data_secret_name: 's3-with-bucket',
  },
};

// ---------------------------------------------------------------------------
// Timeseries mock pipeline run
// ---------------------------------------------------------------------------

const mockTimeseriesPipelineRun: PipelineRun = {
  run_id: 'b2c3d4e5-6789-abcd-ef01-234567890abc',
  display_name: 'timeseries-1773928600000',
  experiment_id: 'f2a3b4c5-d6e7-8901-bcde-f01234567890',
  state: 'SUCCEEDED',
  storage_state: 'AVAILABLE',
  created_at: '2026-03-20T10:00:00Z',
  finished_at: '2026-03-20T15:30:00Z',
  runtime_config: {
    parameters: {
      display_name: 'test-run',
      task_type: 'timeseries',
      target: 'sales',
      id_column: 'store_id',
      timestamp_column: 'date',
      prediction_length: 7,
      preset: 'speed',
      eval_metric: 'MASE',
      top_n: 3,
      train_data_bucket_name: 'my-automl-bucket',
      train_data_file_key: 'store_sales.csv',
      train_data_secret_name: 's3-with-bucket',
    },
  },
};

// ---------------------------------------------------------------------------
// Timeseries mock models
// ---------------------------------------------------------------------------

const TS_RUN_ID = mockTimeseriesPipelineRun.run_id;
const TS_TASK_ID = '33bc4567-8901-def0-2345-678901abcdef';

const buildTimeseriesLocation = (
  runId: string,
  taskId: string,
  modelName: string,
): AutomlModel['location'] => {
  const base = `autogluon-timeseries-training-pipeline/${runId}/autogluon-timeseries-models-training/${taskId}/models_artifact/${modelName}`;
  return {
    model_directory: `${base}/`,
    predictor: `${base}/predictor`,
    notebook: `${base}/notebooks/automl_predictor_notebook.ipynb`,
  };
};

const mockTimeseriesModels: Record<string, AutomlModel> = {
  TemporalFusionTransformer: {
    name: 'TemporalFusionTransformer',
    location: buildTimeseriesLocation(TS_RUN_ID, TS_TASK_ID, 'TemporalFusionTransformer'),
    metrics: {
      test_data: {
        mase: 0.082,
        mape: 0.091,
        mse: 12.45,
        rmse: 3.528,
        mae: 2.81,
      },
    },
  },
  DeepAR: {
    name: 'DeepAR',
    location: buildTimeseriesLocation(TS_RUN_ID, TS_TASK_ID, 'DeepAR'),
    metrics: {
      test_data: {
        mase: 0.105,
        mape: 0.118,
        mse: 18.72,
        rmse: 4.327,
        mae: 3.42,
      },
    },
  },
  AutoETS: {
    name: 'AutoETS',
    location: buildTimeseriesLocation(TS_RUN_ID, TS_TASK_ID, 'AutoETS'),
    metrics: {
      test_data: {
        mase: 0.134,
        mape: 0.152,
        mse: 24.31,
        rmse: 4.931,
        mae: 4.05,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Timeseries mock context
// ---------------------------------------------------------------------------

export const mockTimeseriesContext: MockAutomlResultsContext = {
  pipelineRun: mockTimeseriesPipelineRun,
  pipelineRunLoading: false,
  models: mockTimeseriesModels,
  modelsLoading: false,
  parameters: {
    task_type: 'timeseries',
    target: 'sales',
    id_column: 'store_id',
    timestamp_column: 'date',
    prediction_length: 7,
    top_n: 3,
    train_data_bucket_name: 'my-automl-bucket',
    train_data_file_key: 'store_sales.csv',
    train_data_secret_name: 's3-with-bucket',
  },
};

// ---------------------------------------------------------------------------
// Timeseries per-model supplementary data
// ---------------------------------------------------------------------------

export const mockTimeseriesFeatureImportances: Record<string, FeatureImportanceData> = {
  TemporalFusionTransformer: {
    importance: {
      day_of_week: 0.215,
      month: 0.185,
      promotion: 0.142,
      holiday: 0.098,
      temperature: 0.065,
    },
  },
  DeepAR: {
    importance: {
      month: 0.198,
      day_of_week: 0.176,
      promotion: 0.131,
      holiday: 0.088,
      temperature: 0.072,
    },
  },
  AutoETS: {
    importance: {
      month: 0.241,
      day_of_week: 0.158,
      promotion: 0.105,
      temperature: 0.082,
      holiday: 0.061,
    },
  },
};

// ---------------------------------------------------------------------------
// Per-model supplementary data (fetched from S3 in real usage)
// ---------------------------------------------------------------------------

export const mockTabularFeatureImportances: Record<string, FeatureImportanceData> = {
  CatBoost_BAG_L2_FULL: {
    importance: {
      color: 0.183,
      hair_length: 0.125,
      has_soul: 0.098,
      bone_length: 0.076,
      rotting_flesh: 0.054,
    },
  },
  RandomForest_BAG_L1_FULL: {
    importance: {
      hair_length: 0.152,
      color: 0.141,
      bone_length: 0.089,
      rotting_flesh: 0.072,
      has_soul: 0.065,
    },
  },
  NeuralNet_BAG_L1_FULL: {
    importance: {
      color: 0.169,
      bone_length: 0.11,
      hair_length: 0.105,
      has_soul: 0.081,
      rotting_flesh: 0.063,
    },
  },
};

export const mockTabularConfusionMatrices: Record<string, ConfusionMatrixData> = {
  CatBoost_BAG_L2_FULL: {
    Ghost: { Ghost: 10, Ghoul: 0, Goblin: 2 },
    Ghoul: { Ghost: 1, Ghoul: 10, Goblin: 2 },
    Goblin: { Ghost: 2, Ghoul: 6, Goblin: 5 },
  },
  RandomForest_BAG_L1_FULL: {
    Ghost: { Ghost: 9, Ghoul: 1, Goblin: 2 },
    Ghoul: { Ghost: 2, Ghoul: 8, Goblin: 3 },
    Goblin: { Ghost: 1, Ghoul: 5, Goblin: 7 },
  },
  NeuralNet_BAG_L1_FULL: {
    Ghost: { Ghost: 9, Ghoul: 2, Goblin: 1 },
    Ghoul: { Ghost: 3, Ghoul: 7, Goblin: 3 },
    Goblin: { Ghost: 2, Ghoul: 4, Goblin: 7 },
  },
};

// ---------------------------------------------------------------------------
// Mock curves data — binary
// ---------------------------------------------------------------------------

export const mockBinaryCurvesData: CurvesData = {
  task_type: 'binary',
  positive_class: 1,
  num_samples: 2000,
  num_positive: 1024,
  num_negative: 976,
  roc_curve: {
    auc: 0.9821,
    fpr: [0.0, 0.0, 0.012, 0.046, 0.089, 0.123, 0.235, 0.457, 0.789, 1.0],
    tpr: [0.0, 0.235, 0.568, 0.789, 0.89, 0.935, 0.968, 0.989, 0.999, 1.0],
    thresholds: ['inf', 0.988, 0.877, 0.765, 0.654, 0.543, 0.432, 0.321, 0.211, 0.11],
  },
  precision_recall_curve: {
    average_precision: 0.9567,
    precision: [0.512, 0.679, 0.789, 0.846, 0.901, 0.935, 0.968, 0.989, 1.0],
    recall: [1.0, 0.988, 0.946, 0.89, 0.823, 0.746, 0.601, 0.457, 0.0],
    thresholds: [0.123, 0.235, 0.346, 0.457, 0.568, 0.679, 0.789, 0.89],
    baseline_precision: 0.512,
  },
};

// ---------------------------------------------------------------------------
// Mock curves data — multiclass (per model)
// ---------------------------------------------------------------------------

export const mockMulticlassCurvesData: Record<string, CurvesData> = {
  CatBoost_BAG_L2_FULL: {
    task_type: 'multiclass',
    strategy: 'ovr',
    num_classes: 3,
    classes: ['Ghost', 'Ghoul', 'Goblin'],
    num_samples: 38,
    roc_curve: {
      auc_macro: 0.8456,
      auc_weighted: 0.8512,
      per_class: {
        Ghost: {
          auc: 0.9123,
          fpr: [0.0, 0.0, 0.02, 0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 1.0],
          tpr: [0.0, 0.5, 0.72, 0.85, 0.91, 0.95, 0.98, 0.99, 1.0, 1.0],
          thresholds: ['inf', 0.95, 0.88, 0.76, 0.65, 0.52, 0.38, 0.22, 0.1, 0.01],
          support: 12,
        },
        Ghoul: {
          auc: 0.8654,
          fpr: [0.0, 0.02, 0.05, 0.1, 0.15, 0.25, 0.4, 0.6, 0.8, 1.0],
          tpr: [0.0, 0.3, 0.55, 0.7, 0.8, 0.88, 0.93, 0.97, 0.99, 1.0],
          thresholds: ['inf', 0.92, 0.84, 0.71, 0.6, 0.48, 0.35, 0.2, 0.08, 0.01],
          support: 13,
        },
        Goblin: {
          auc: 0.7591,
          fpr: [0.0, 0.05, 0.1, 0.15, 0.25, 0.35, 0.5, 0.7, 0.85, 1.0],
          tpr: [0.0, 0.2, 0.4, 0.55, 0.68, 0.78, 0.88, 0.94, 0.98, 1.0],
          thresholds: ['inf', 0.88, 0.79, 0.65, 0.52, 0.4, 0.28, 0.15, 0.06, 0.01],
          support: 13,
        },
      },
    },
    precision_recall_curve: {
      average_precision_macro: 0.8934,
      average_precision_weighted: 0.9012,
      per_class: {
        Ghost: {
          average_precision: 0.9567,
          precision: [0.346, 0.568, 0.789, 0.89, 0.946, 0.979, 1.0],
          recall: [1.0, 0.988, 0.923, 0.857, 0.746, 0.568, 0.0],
          thresholds: [0.101, 0.235, 0.412, 0.568, 0.69, 0.823],
          baseline_precision: 0.316,
        },
        Ghoul: {
          average_precision: 0.8723,
          precision: [0.323, 0.546, 0.768, 0.879, 0.931, 0.97, 1.0],
          recall: [1.0, 0.989, 0.935, 0.868, 0.757, 0.589, 0.0],
          thresholds: [0.099, 0.212, 0.399, 0.546, 0.679, 0.812],
          baseline_precision: 0.342,
        },
        Goblin: {
          average_precision: 0.8512,
          precision: [0.312, 0.523, 0.746, 0.868, 0.923, 0.966, 1.0],
          recall: [1.0, 0.991, 0.94, 0.879, 0.768, 0.601, 0.0],
          thresholds: [0.088, 0.201, 0.388, 0.523, 0.668, 0.799],
          baseline_precision: 0.342,
        },
      },
    },
  },
  RandomForest_BAG_L1_FULL: {
    task_type: 'multiclass',
    strategy: 'ovr',
    num_classes: 3,
    classes: ['Ghost', 'Ghoul', 'Goblin'],
    num_samples: 38,
    roc_curve: {
      auc_macro: 0.8102,
      auc_weighted: 0.8156,
      per_class: {
        Ghost: {
          auc: 0.8812,
          fpr: [0.0, 0.01, 0.04, 0.08, 0.15, 0.25, 0.45, 0.65, 0.85, 1.0],
          tpr: [0.0, 0.4, 0.6, 0.75, 0.85, 0.92, 0.96, 0.98, 1.0, 1.0],
          thresholds: ['inf', 0.93, 0.85, 0.72, 0.6, 0.48, 0.33, 0.18, 0.07, 0.01],
          support: 12,
        },
        Ghoul: {
          auc: 0.8245,
          fpr: [0.0, 0.03, 0.07, 0.12, 0.2, 0.3, 0.45, 0.65, 0.82, 1.0],
          tpr: [0.0, 0.25, 0.48, 0.62, 0.75, 0.84, 0.91, 0.96, 0.99, 1.0],
          thresholds: ['inf', 0.9, 0.81, 0.68, 0.56, 0.44, 0.31, 0.17, 0.06, 0.01],
          support: 13,
        },
        Goblin: {
          auc: 0.7249,
          fpr: [0.0, 0.06, 0.12, 0.2, 0.3, 0.42, 0.55, 0.72, 0.88, 1.0],
          tpr: [0.0, 0.15, 0.35, 0.5, 0.63, 0.74, 0.85, 0.92, 0.97, 1.0],
          thresholds: ['inf', 0.85, 0.75, 0.62, 0.5, 0.38, 0.25, 0.13, 0.05, 0.01],
          support: 13,
        },
      },
    },
    precision_recall_curve: {
      average_precision_macro: 0.8501,
      average_precision_weighted: 0.8578,
      per_class: {
        Ghost: {
          average_precision: 0.9212,
          precision: [0.335, 0.545, 0.762, 0.87, 0.932, 0.971, 1.0],
          recall: [1.0, 0.985, 0.912, 0.842, 0.735, 0.555, 0.0],
          thresholds: [0.095, 0.225, 0.402, 0.558, 0.682, 0.815],
          baseline_precision: 0.316,
        },
        Ghoul: {
          average_precision: 0.8345,
          precision: [0.312, 0.525, 0.745, 0.858, 0.918, 0.962, 1.0],
          recall: [1.0, 0.986, 0.925, 0.855, 0.742, 0.575, 0.0],
          thresholds: [0.091, 0.202, 0.385, 0.535, 0.668, 0.802],
          baseline_precision: 0.342,
        },
        Goblin: {
          average_precision: 0.7946,
          precision: [0.298, 0.502, 0.722, 0.842, 0.908, 0.955, 1.0],
          recall: [1.0, 0.988, 0.932, 0.865, 0.752, 0.588, 0.0],
          thresholds: [0.082, 0.192, 0.375, 0.512, 0.655, 0.789],
          baseline_precision: 0.342,
        },
      },
    },
  },
  NeuralNet_BAG_L1_FULL: {
    task_type: 'multiclass',
    strategy: 'ovr',
    num_classes: 3,
    classes: ['Ghost', 'Ghoul', 'Goblin'],
    num_samples: 38,
    roc_curve: {
      auc_macro: 0.789,
      auc_weighted: 0.7935,
      per_class: {
        Ghost: {
          auc: 0.8601,
          fpr: [0.0, 0.02, 0.06, 0.1, 0.18, 0.28, 0.48, 0.68, 0.86, 1.0],
          tpr: [0.0, 0.35, 0.55, 0.7, 0.82, 0.9, 0.95, 0.98, 1.0, 1.0],
          thresholds: ['inf', 0.91, 0.82, 0.7, 0.58, 0.45, 0.31, 0.16, 0.06, 0.01],
          support: 12,
        },
        Ghoul: {
          auc: 0.789,
          fpr: [0.0, 0.04, 0.09, 0.15, 0.23, 0.33, 0.48, 0.67, 0.84, 1.0],
          tpr: [0.0, 0.2, 0.42, 0.58, 0.72, 0.82, 0.9, 0.95, 0.98, 1.0],
          thresholds: ['inf', 0.88, 0.78, 0.65, 0.53, 0.41, 0.29, 0.15, 0.05, 0.01],
          support: 13,
        },
        Goblin: {
          auc: 0.7179,
          fpr: [0.0, 0.07, 0.14, 0.22, 0.32, 0.44, 0.58, 0.74, 0.9, 1.0],
          tpr: [0.0, 0.12, 0.3, 0.46, 0.6, 0.72, 0.83, 0.91, 0.96, 1.0],
          thresholds: ['inf', 0.83, 0.73, 0.6, 0.48, 0.36, 0.23, 0.12, 0.04, 0.01],
          support: 13,
        },
      },
    },
    precision_recall_curve: {
      average_precision_macro: 0.8234,
      average_precision_weighted: 0.8312,
      per_class: {
        Ghost: {
          average_precision: 0.8956,
          precision: [0.325, 0.532, 0.748, 0.858, 0.922, 0.965, 1.0],
          recall: [1.0, 0.982, 0.905, 0.832, 0.722, 0.542, 0.0],
          thresholds: [0.09, 0.218, 0.395, 0.548, 0.672, 0.808],
          baseline_precision: 0.316,
        },
        Ghoul: {
          average_precision: 0.8012,
          precision: [0.302, 0.512, 0.732, 0.845, 0.908, 0.955, 1.0],
          recall: [1.0, 0.984, 0.918, 0.845, 0.732, 0.562, 0.0],
          thresholds: [0.085, 0.195, 0.378, 0.525, 0.658, 0.795],
          baseline_precision: 0.342,
        },
        Goblin: {
          average_precision: 0.7734,
          precision: [0.288, 0.492, 0.71, 0.832, 0.898, 0.948, 1.0],
          recall: [1.0, 0.985, 0.925, 0.855, 0.742, 0.575, 0.0],
          thresholds: [0.078, 0.185, 0.368, 0.502, 0.645, 0.782],
          baseline_precision: 0.342,
        },
      },
    },
  },
};

export const mockBackTestingData: BackTestingData = {
  schema_version: 1,
  model_name: 'Theta_FULL',
  prediction_length: 1,
  num_val_windows: 3,
  eval_metric: 'MASE',
  target: 'target',
  id_column: 'item_id',
  timestamp_column: 'timestamp',
  per_window_metrics: [
    {
      window_id: 0,
      cutoff: -3,
      test_start: '2025-12-08',
      test_end: '2025-12-14',
      metrics: { MASE: 0.3941, MAPE: 0.0967, RMSE: 260.64, MAE: 101.11 },
    },
    {
      window_id: 1,
      cutoff: -2,
      test_start: '2025-12-15',
      test_end: '2025-12-21',
      metrics: { MASE: 0.4484, MAPE: 0.1208, RMSE: 241.45, MAE: 109.88 },
    },
    {
      window_id: 2,
      cutoff: -1,
      test_start: '2025-12-22',
      test_end: '2025-12-28',
      metrics: { MASE: 0.3655, MAPE: 0.0612, RMSE: 191.44, MAE: 83.12 },
    },
  ],
  series_analysis: {
    num_series_evaluated: 200,
    best_performer: {
      item_id: 'H49',
      avg_metrics: { RMSE: 21.41, MAPE: 0.1369, MAE: 21.41 },
      windows: [
        {
          window_id: 0,
          metrics: { MAPE: 0.2227, RMSE: 37.01, MAE: 37.01 },
          forecast_data: [
            {
              timestamp: '2025-12-08T05:00:00Z',
              actual: 16622.0,
              predicted: 16585.0,
              lower_bound: 16386.2,
              upper_bound: 16807.7,
              lower_quantile: 0.1,
              upper_quantile: 0.9,
            },
          ],
        },
        {
          window_id: 1,
          metrics: { MAPE: 0.0358, RMSE: 5.51, MAE: 5.51 },
          forecast_data: [
            {
              timestamp: '2025-12-15T06:00:00Z',
              actual: 15391.0,
              predicted: 15396.5,
              lower_bound: 15212.6,
              upper_bound: 15602.5,
              lower_quantile: 0.1,
              upper_quantile: 0.9,
            },
          ],
        },
        {
          window_id: 2,
          metrics: { MAPE: 0.1523, RMSE: 21.72, MAE: 21.72 },
          forecast_data: [
            {
              timestamp: '2025-12-22T07:00:00Z',
              actual: 14262.0,
              predicted: 14240.3,
              lower_bound: 14070.4,
              upper_bound: 14430.6,
              lower_quantile: 0.1,
              upper_quantile: 0.9,
            },
          ],
        },
      ],
    },
    worst_performer: {
      item_id: 'H158',
      avg_metrics: { RMSE: 153.37, MAPE: 125.55, MAE: 153.37 },
      windows: [
        {
          window_id: 0,
          metrics: { MAPE: 134.55, RMSE: 131.86, MAE: 131.86 },
          forecast_data: [
            {
              timestamp: '2025-12-08T05:00:00Z',
              actual: 98.0,
              predicted: 229.86,
              lower_bound: 196.9,
              upper_bound: 266.78,
              lower_quantile: 0.1,
              upper_quantile: 0.9,
            },
          ],
        },
        {
          window_id: 1,
          metrics: { MAPE: 219.98, RMSE: 277.17, MAE: 277.17 },
          forecast_data: [
            {
              timestamp: '2025-12-15T06:00:00Z',
              actual: 126.0,
              predicted: 403.17,
              lower_bound: 271.63,
              upper_bound: 550.55,
              lower_quantile: 0.1,
              upper_quantile: 0.9,
            },
          ],
        },
        {
          window_id: 2,
          metrics: { MAPE: 22.11, RMSE: 51.07, MAE: 51.07 },
          forecast_data: [
            {
              timestamp: '2025-12-22T07:00:00Z',
              actual: 231.0,
              predicted: 282.07,
              lower_bound: 6.01,
              upper_bound: 591.35,
              lower_quantile: 0.1,
              upper_quantile: 0.9,
            },
          ],
        },
      ],
    },
  },
};

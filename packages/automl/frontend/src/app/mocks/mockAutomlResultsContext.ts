/* eslint-disable camelcase */
import type { FeatureImportanceData, ConfusionMatrixData, PipelineRun } from '~/app/types';
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
  const base = `${pipelineName}/${runId}/autogluon-models-full-refit/${taskId}/model_artifact/${modelName}`;
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
  const base = `autogluon-timeseries-training-pipeline/${runId}/autogluon-timeseries-models-full-refit/${taskId}/model_artifact/${modelName}`;
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

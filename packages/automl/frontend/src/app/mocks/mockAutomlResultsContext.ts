/* eslint-disable camelcase */
import type {
  TaskType,
  FeatureImportanceData,
  ConfusionMatrixData,
  PipelineRun,
} from '~/app/types';

export type MockAutomlModel = {
  display_name: string;
  model_config: {
    eval_metric: string;
  };
  location: {
    model_directory: string;
    predictor: string;
    notebook: string;
  };
  metrics: {
    test_data: Record<string, unknown>;
  };
};

export type MockAutomlResultsContext = {
  pipelineRun: PipelineRun;
  pipelineRunLoading: boolean;
  models: Record<string, MockAutomlModel>;
  modelsLoading: boolean;
  parameters: {
    task_type: TaskType;
    label_column: string;
    [key: string]: unknown;
  };
};

// ---------------------------------------------------------------------------
// Helper — builds the full S3 path for a model
// ---------------------------------------------------------------------------

const buildLocation = (
  pipelineName: string,
  runId: string,
  taskId: string,
  modelName: string,
): MockAutomlModel['location'] => {
  const base = `${pipelineName}/${runId}/autogluon-models-full-refit/${taskId}/model_artifact/${modelName}`;
  return {
    model_directory: `${base}/`,
    predictor: `${base}/predictor/predictor.pkl`,
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
      label_column: 'type',
      task_type: 'multiclass',
      top_n: '3',
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

const mockModels: Record<string, MockAutomlModel> = {
  CatBoost_BAG_L2_FULL: {
    display_name: 'CatBoost_BAG_L2_FULL',
    model_config: { eval_metric: 'accuracy' },
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
    display_name: 'RandomForest_BAG_L1_FULL',
    model_config: { eval_metric: 'accuracy' },
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
    display_name: 'NeuralNet_BAG_L1_FULL',
    model_config: { eval_metric: 'accuracy' },
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

export const mockMulticlassContext: MockAutomlResultsContext = {
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
// Per-model supplementary data (fetched from S3 in real usage)
// ---------------------------------------------------------------------------

export const mockMulticlassFeatureImportances: Record<string, FeatureImportanceData> = {
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

export const mockMulticlassConfusionMatrices: Record<string, ConfusionMatrixData> = {
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

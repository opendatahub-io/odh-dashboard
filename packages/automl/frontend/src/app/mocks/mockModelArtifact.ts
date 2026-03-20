/* eslint-disable camelcase */
import type { ModelArtifact, FeatureImportanceData, ConfusionMatrixData } from '~/app/types';

// ---------------------------------------------------------------------------
// Base schema — shared defaults across all mock models
// ---------------------------------------------------------------------------

const BASE_DATA_CONFIG: ModelArtifact['context']['data_config'] = {
  sampling_config: { n_samples: 1000 },
  split_config: { test_size: 0.3, random_state: 42 },
};

const BASE_MODEL_CONFIG: ModelArtifact['context']['model_config'] = {
  eval_metric: 'accuracy',
  time_limit: 300,
};

// ---------------------------------------------------------------------------
// Builder — creates a list of ModelArtifact from minimal per-model config
// ---------------------------------------------------------------------------

type MockModelEntry = {
  display_name: string;
  metrics: Record<string, number>;
};

type TaskGroupConfig = {
  task_type: ModelArtifact['context']['task_type'];
  label_column: string;
  eval_metric?: string;
  models: MockModelEntry[];
};

function buildMockModels({
  task_type,
  label_column,
  eval_metric,
  models,
}: TaskGroupConfig): ModelArtifact[] {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const model_config = eval_metric ? { ...BASE_MODEL_CONFIG, eval_metric } : BASE_MODEL_CONFIG;

  return models.map((entry) => ({
    display_name: entry.display_name,
    context: {
      data_config: BASE_DATA_CONFIG,
      task_type,
      label_column,
      model_config,
      location: {
        model_directory: entry.display_name,
        predictor: `${entry.display_name}/predictor/predictor.pkl`,
        notebook: `${entry.display_name}/notebooks/automl_predictor_notebook.ipynb`,
      },
      metrics: { test_data: entry.metrics },
    },
  }));
}

// ---------------------------------------------------------------------------
// Mock model arrays — one per task type
// ---------------------------------------------------------------------------

export const mockBinaryModels: ModelArtifact[] = buildMockModels({
  task_type: 'binary',
  label_column: 'Survived',
  models: [
    {
      display_name: 'XGBoost_BAG_L1_FULL',
      metrics: {
        accuracy: 0.788,
        balanced_accuracy: 0.681,
        mcc: 0.41,
        roc_auc: 0.834,
        f1: 0.532,
        precision: 0.642,
        recall: 0.455,
      },
    },
    {
      display_name: 'LightGBM_BAG_L1_FULL',
      metrics: {
        accuracy: 0.774,
        balanced_accuracy: 0.665,
        mcc: 0.39,
        roc_auc: 0.819,
        f1: 0.511,
        precision: 0.621,
        recall: 0.433,
      },
    },
    {
      display_name: 'CatBoost_BAG_L1_FULL',
      metrics: {
        accuracy: 0.769,
        balanced_accuracy: 0.651,
        mcc: 0.37,
        roc_auc: 0.805,
        f1: 0.495,
        precision: 0.608,
        recall: 0.418,
      },
    },
  ],
});

export const mockMulticlassModels: ModelArtifact[] = buildMockModels({
  task_type: 'multiclass',
  label_column: 'type',
  models: [
    {
      display_name: 'CatBoost_BAG_L2_FULL',
      metrics: {
        accuracy: 0.658,
        balanced_accuracy: 0.662,
        mcc: 0.487,
        f1: 0.648,
        precision: 0.65,
        recall: 0.662,
      },
    },
    {
      display_name: 'RandomForest_BAG_L1_FULL',
      metrics: {
        accuracy: 0.632,
        balanced_accuracy: 0.635,
        mcc: 0.448,
        f1: 0.621,
        precision: 0.628,
        recall: 0.635,
      },
    },
    {
      display_name: 'NeuralNet_BAG_L1_FULL',
      metrics: {
        accuracy: 0.605,
        balanced_accuracy: 0.61,
        mcc: 0.408,
        f1: 0.598,
        precision: 0.603,
        recall: 0.61,
      },
    },
  ],
});

export const mockRegressionModels: ModelArtifact[] = buildMockModels({
  task_type: 'regression',
  label_column: 'bone_length',
  eval_metric: 'root_mean_squared_error',
  models: [
    {
      display_name: 'Ridge_BAG_L1_FULL',
      metrics: { root_mean_squared_error: -0.084, r2: 0.325 },
    },
    {
      display_name: 'LightGBM_BAG_L1_FULL',
      metrics: { root_mean_squared_error: -0.091, r2: 0.298 },
    },
    {
      display_name: 'XGBoost_BAG_L2_FULL',
      metrics: { root_mean_squared_error: -0.097, r2: 0.271 },
    },
  ],
});

// ---------------------------------------------------------------------------
// Per-model supplementary data (feature importance, confusion matrix)
// ---------------------------------------------------------------------------

export const mockBinaryFeatureImportances: FeatureImportanceData[] = [
  {
    importance: {
      Sex: 0.1203,
      Pclass: 0.0852,
      Fare: 0.0741,
      Age: 0.0698,
      Cabin: 0.0423,
      Embarked: 0.0312,
      SibSp: 0.0187,
    },
  },
  {
    importance: {
      Fare: 0.1105,
      Sex: 0.0983,
      Age: 0.0812,
      Pclass: 0.0654,
      Cabin: 0.0398,
      SibSp: 0.0245,
      Embarked: 0.0201,
    },
  },
  {
    importance: {
      Sex: 0.135,
      Fare: 0.092,
      Pclass: 0.078,
      Age: 0.056,
      Embarked: 0.041,
      Cabin: 0.035,
      SibSp: 0.015,
    },
  },
];

export const mockMulticlassFeatureImportances: FeatureImportanceData[] = [
  {
    importance: {
      color: 0.183,
      hair_length: 0.125,
      has_soul: 0.098,
      bone_length: 0.076,
      rotting_flesh: 0.054,
    },
  },
  {
    importance: {
      hair_length: 0.152,
      color: 0.141,
      bone_length: 0.089,
      rotting_flesh: 0.072,
      has_soul: 0.065,
    },
  },
  {
    importance: {
      color: 0.169,
      bone_length: 0.11,
      hair_length: 0.105,
      has_soul: 0.081,
      rotting_flesh: 0.063,
    },
  },
];

export const mockRegressionFeatureImportances: FeatureImportanceData[] = [
  {
    importance: {
      rotting_flesh: 0.1485,
      hair_length: 0.123,
      has_soul: 0.089,
      color: 0.065,
      bone_length: 0.041,
    },
  },
  {
    importance: {
      hair_length: 0.161,
      rotting_flesh: 0.118,
      color: 0.095,
      has_soul: 0.072,
      bone_length: 0.053,
    },
  },
  {
    importance: {
      rotting_flesh: 0.132,
      color: 0.115,
      hair_length: 0.102,
      bone_length: 0.068,
      has_soul: 0.055,
    },
  },
];

export const mockBinaryConfusionMatrices: ConfusionMatrixData[] = [
  {
    'Not Survived': { 'Not Survived': 492, Survived: 57 },
    Survived: { 'Not Survived': 89, Survived: 253 },
  },
  {
    'Not Survived': { 'Not Survived': 478, Survived: 71 },
    Survived: { 'Not Survived': 102, Survived: 240 },
  },
  {
    'Not Survived': { 'Not Survived': 465, Survived: 84 },
    Survived: { 'Not Survived': 115, Survived: 227 },
  },
];

export const mockMulticlassConfusionMatrices: ConfusionMatrixData[] = [
  {
    Ghost: { Ghost: 10, Ghoul: 0, Goblin: 2 },
    Ghoul: { Ghost: 1, Ghoul: 10, Goblin: 2 },
    Goblin: { Ghost: 2, Ghoul: 6, Goblin: 5 },
  },
  {
    Ghost: { Ghost: 9, Ghoul: 1, Goblin: 2 },
    Ghoul: { Ghost: 2, Ghoul: 8, Goblin: 3 },
    Goblin: { Ghost: 1, Ghoul: 5, Goblin: 7 },
  },
  {
    Ghost: { Ghost: 8, Ghoul: 2, Goblin: 2 },
    Ghoul: { Ghost: 3, Ghoul: 7, Goblin: 3 },
    Goblin: { Ghost: 2, Ghoul: 4, Goblin: 7 },
  },
];

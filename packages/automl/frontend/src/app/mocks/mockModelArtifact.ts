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
// Supplementary data (feature importance, confusion matrix)
// ---------------------------------------------------------------------------

export const mockFeatureImportance: FeatureImportanceData = {
  importance: {
    Sex: 0.1203,
    Pclass: 0.0852,
    Fare: 0.0741,
    Age: 0.0698,
    Cabin: 0.0423,
    Embarked: 0.0312,
    SibSp: 0.0187,
  },
  stddev: {
    Sex: 0.012,
    Pclass: 0.009,
    Fare: 0.011,
    Age: 0.008,
    Cabin: 0.007,
    Embarked: 0.005,
    SibSp: 0.003,
  },
  p_value: {
    Sex: 0.001,
    Pclass: 0.002,
    Fare: 0.003,
    Age: 0.004,
    Cabin: 0.01,
    Embarked: 0.02,
    SibSp: 0.05,
  },
  n: { Sex: 30, Pclass: 30, Fare: 30, Age: 30, Cabin: 30, Embarked: 30, SibSp: 30 },
  p99_high: {
    Sex: 0.145,
    Pclass: 0.103,
    Fare: 0.096,
    Age: 0.086,
    Cabin: 0.056,
    Embarked: 0.041,
    SibSp: 0.025,
  },
  p99_low: {
    Sex: 0.096,
    Pclass: 0.067,
    Fare: 0.052,
    Age: 0.054,
    Cabin: 0.029,
    Embarked: 0.021,
    SibSp: 0.012,
  },
};

export const mockBinaryConfusionMatrix: ConfusionMatrixData = {
  'Not Survived': { 'Not Survived': 492, Survived: 57 },
  Survived: { 'Not Survived': 89, Survived: 253 },
};

export const mockMulticlassConfusionMatrix: ConfusionMatrixData = {
  Ghost: { Ghost: 10, Ghoul: 0, Goblin: 2 },
  Ghoul: { Ghost: 1, Ghoul: 10, Goblin: 2 },
  Goblin: { Ghost: 2, Ghoul: 6, Goblin: 5 },
};

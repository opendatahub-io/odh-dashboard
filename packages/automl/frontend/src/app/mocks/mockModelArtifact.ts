/* eslint-disable camelcase */
import type { ModelArtifact } from '~/app/types';

type MockModelArtifactOptions = Partial<ModelArtifact>;

export const mockModelArtifact = (overrides: MockModelArtifactOptions = {}): ModelArtifact => ({
  display_name: 'XGBoost_BAG_L1_FULL',
  rank: 1,
  created_at: '2026-02-17T12:30:24Z',
  context: {
    data_config: {
      sampling_config: { n_samples: 1000 },
      split_config: { test_size: 0.3, random_state: 42 },
    },
    task_type: 'binary',
    label_column: 'Survived',
    model_config: { eval_metric: 'accuracy', time_limit: 300 },
    location: {
      model_directory: 'XGBoost_BAG_L1_FULL',
      predictor: 'XGBoost_BAG_L1_FULL/predictor/predictor.pkl',
      notebook: 'XGBoost_BAG_L1_FULL/notebooks/automl_predictor_notebook.ipynb',
    },
    metrics: {
      test_data: {
        accuracy: 0.788,
        balanced_accuracy: 0.681,
        mcc: 0.41,
        roc_auc: 0.834,
        f1: 0.532,
        precision: 0.642,
        recall: 0.455,
      },
    },
  },
  ...overrides,
});

export const mockBinaryArtifact = (overrides: MockModelArtifactOptions = {}): ModelArtifact =>
  mockModelArtifact(overrides);

export const mockMulticlassArtifact = (overrides: MockModelArtifactOptions = {}): ModelArtifact =>
  mockModelArtifact({
    display_name: 'CatBoost_BAG_L2_FULL',
    rank: 1,
    created_at: '2026-02-17T12:42:56Z',
    context: {
      data_config: {
        sampling_config: { n_samples: 500 },
        split_config: { test_size: 0.3, random_state: 42 },
      },
      task_type: 'multiclass',
      label_column: 'type',
      model_config: { eval_metric: 'accuracy', time_limit: 300 },
      location: {
        model_directory: 'CatBoost_BAG_L2_FULL',
        predictor: 'CatBoost_BAG_L2_FULL/predictor/predictor.pkl',
        notebook: 'CatBoost_BAG_L2_FULL/notebooks/automl_predictor_notebook.ipynb',
      },
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
    ...overrides,
  });

export const mockRegressionArtifact = (overrides: MockModelArtifactOptions = {}): ModelArtifact =>
  mockModelArtifact({
    display_name: 'Ridge_BAG_L1_FULL',
    rank: 1,
    created_at: '2026-02-17T12:36:32Z',
    context: {
      data_config: {
        sampling_config: { n_samples: 500 },
        split_config: { test_size: 0.3, random_state: 42 },
      },
      task_type: 'regression',
      label_column: 'bone_length',
      model_config: { eval_metric: 'root_mean_squared_error', time_limit: 300 },
      location: {
        model_directory: 'Ridge_BAG_L1_FULL',
        predictor: 'Ridge_BAG_L1_FULL/predictor/predictor.pkl',
        notebook: 'Ridge_BAG_L1_FULL/notebooks/automl_predictor_notebook.ipynb',
      },
      metrics: {
        test_data: {
          root_mean_squared_error: -0.084,
          r2: 0.325,
        },
      },
    },
    ...overrides,
  });

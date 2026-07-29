import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import type { PipelineRun } from '~/app/types';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import { getPipelineSummaryDetails } from '~/app/components/run-results/pipelineSummaryMetadata';
import * as utils from '~/app/utilities/utils';

/* eslint-disable camelcase */

const mockModel = (name: string): AutomlModel => ({
  name,
  location: {
    model_directory: `s3://bucket/${name}`,
    predictor: 'predictor.pkl',
    notebook: 'notebook.ipynb',
  },
  metrics: { test_data: { accuracy: 0.91 } },
});

const mockStageMap: ComponentStageMap = {
  pipeline_id: 'autogluon-tabular-training-pipeline',
  description: 'Tabular AutoGluon pipeline',
  kfp_run_id: 'run-123',
  published_at: '2026-06-04T17:47:14.948493Z',
  components: [
    {
      id: 'autogluon_models_training',
      description: 'Train AutoGluon tabular models',
      stages: [
        {
          id: 'model_selection',
          description: 'Run AutoGluon model selection',
          status: 'completed',
          top_n: 3,
          selected_models: ['ExtraTreesGini_BAG_L2', 'LightGBM_BAG_L2', 'LightGBMLarge_BAG_L2'],
        },
        {
          id: 'evaluate_models',
          description: 'Evaluate refit models',
          status: 'completed',
          eval_metric: 'accuracy',
        },
      ],
    },
    {
      id: 'leaderboard_evaluation',
      description: 'Leaderboard',
      stages: [
        {
          id: 'build_leaderboard',
          description: 'Build leaderboard',
          status: 'completed',
          best_model: 'LightGBM_BAG_L2',
        },
      ],
    },
  ],
};

const mockPipelineRun: PipelineRun = {
  run_id: 'run-123',
  display_name: 'Test run',
  created_at: '2026-06-04T17:47:14.948493Z',
  finished_at: '2026-06-04T17:50:10.290690Z',
  state: 'SUCCEEDED',
};

const models = {
  LightGBM_BAG_L2: mockModel('LightGBM_BAG_L2'),
  ExtraTreesGini_BAG_L2: mockModel('ExtraTreesGini_BAG_L2'),
};

describe('getPipelineSummaryDetails', () => {
  it('returns pipeline summary fields for a successful run', () => {
    const details = getPipelineSummaryDetails(mockPipelineRun, mockStageMap, models, {
      task_type: 'binary',
      eval_metric: 'accuracy',
      top_n: 3,
    });

    expect(details).toEqual([
      { label: 'Total run time', value: '2 m 55 s' },
      { label: 'Models evaluated', value: '3' },
      { label: 'Winning model', value: 'LightGBM_BAG_L2' },
      { label: 'Evaluation metric', value: 'Accuracy' },
    ]);
  });

  it('falls back to loaded model count when stage map has no selected_models', () => {
    const stageMap: ComponentStageMap = {
      ...mockStageMap,
      components: [
        {
          ...mockStageMap.components[0],
          stages: mockStageMap.components[0].stages.filter(
            (stage) => stage.id !== 'model_selection',
          ),
        },
        mockStageMap.components[1],
      ],
    };

    const details = getPipelineSummaryDetails(mockPipelineRun, stageMap, models, {
      task_type: 'binary',
    });

    expect(details.find((detail) => detail.label === 'Models evaluated')?.value).toBe('2');
  });

  it('counts only unique non-empty selected_models and falls back when none remain', () => {
    const stageMapWithJunk = {
      ...mockStageMap,
      components: [
        {
          ...mockStageMap.components[0],
          stages: mockStageMap.components[0].stages.map((stage) =>
            stage.id === 'model_selection'
              ? {
                  ...stage,
                  selected_models: ['LightGBM_BAG_L2', '', 'LightGBM_BAG_L2', 42, null, 'XGBoost'],
                }
              : stage,
          ),
        },
        mockStageMap.components[1],
      ],
    } as unknown as ComponentStageMap;

    const detailsWithJunk = getPipelineSummaryDetails(
      mockPipelineRun,
      stageMapWithJunk,
      {},
      {
        task_type: 'binary',
      },
    );
    expect(detailsWithJunk.find((detail) => detail.label === 'Models evaluated')?.value).toBe('2');

    const stageMapWithoutValid = {
      ...mockStageMap,
      components: [
        {
          ...mockStageMap.components[0],
          stages: mockStageMap.components[0].stages.map((stage) =>
            stage.id === 'model_selection'
              ? { ...stage, selected_models: ['', 42, null, ''] }
              : stage,
          ),
        },
        mockStageMap.components[1],
      ],
    } as unknown as ComponentStageMap;

    const detailsWithoutValid = getPipelineSummaryDetails(
      mockPipelineRun,
      stageMapWithoutValid,
      models,
      { task_type: 'binary' },
    );
    expect(detailsWithoutValid.find((detail) => detail.label === 'Models evaluated')?.value).toBe(
      '2',
    );
  });

  it('uses em dashes when data is unavailable', () => {
    const details = getPipelineSummaryDetails(undefined, undefined, {}, undefined);

    expect(details).toEqual([
      { label: 'Total run time', value: '—' },
      { label: 'Models evaluated', value: '—' },
      { label: 'Winning model', value: '—' },
      { label: 'Evaluation metric', value: '—' },
    ]);
  });

  it('treats whitespace-only stage eval_metric as absent', () => {
    const stageMap = {
      ...mockStageMap,
      components: [
        {
          ...mockStageMap.components[0],
          stages: mockStageMap.components[0].stages.map((stage) =>
            stage.id === 'evaluate_models' ? { ...stage, eval_metric: '   ' } : stage,
          ),
        },
        mockStageMap.components[1],
      ],
    } as unknown as ComponentStageMap;

    const details = getPipelineSummaryDetails(mockPipelineRun, stageMap, models, undefined);

    expect(details.find((detail) => detail.label === 'Evaluation metric')?.value).toBe('—');
  });

  it('should skip malformed components and stages without throwing', () => {
    const stageMap = {
      ...mockStageMap,
      components: [
        null,
        undefined,
        'not-a-component',
        {
          id: 'autogluon_models_training',
          description: '',
          stages: null,
        },
        {
          id: 'autogluon_models_training',
          description: '',
          stages: [
            null,
            { id: 'model_selection', selected_models: ['LightGBM_BAG_L2'] },
            {
              id: 'model_selection',
              description: 'Run AutoGluon model selection',
              selected_models: ['LightGBM_BAG_L2'],
            },
          ],
        },
      ],
    } as unknown as ComponentStageMap;

    const details = getPipelineSummaryDetails(mockPipelineRun, stageMap, models, {
      task_type: 'binary',
      eval_metric: 'accuracy',
    });

    expect(details.find((detail) => detail.label === 'Models evaluated')?.value).toBe('1');
  });

  it('does not use configured top_n as models evaluated when no observed data exists', () => {
    const details = getPipelineSummaryDetails(mockPipelineRun, undefined, {}, { top_n: 3 });

    expect(details.find((detail) => detail.label === 'Models evaluated')?.value).toBe('—');
  });

  it('shows best_model from nested stage metadata when models are not loaded', () => {
    const stageMap: ComponentStageMap = {
      ...mockStageMap,
      components: mockStageMap.components.map((component) =>
        component.id === 'leaderboard_evaluation'
          ? {
              ...component,
              stages: [
                {
                  id: 'build_leaderboard',
                  description: 'Build leaderboard',
                  status: 'completed',
                  metadata: { best_model: 'LightGBM_BAG_L2' },
                },
              ],
            }
          : component,
      ),
    };

    const details = getPipelineSummaryDetails(
      mockPipelineRun,
      stageMap,
      {},
      {
        task_type: 'binary',
      },
    );

    expect(details.find((detail) => detail.label === 'Winning model')?.value).toBe(
      'LightGBM_BAG_L2',
    );
  });

  it('falls back to the top-ranked loaded model when stage map has no best_model', () => {
    const stageMap: ComponentStageMap = {
      ...mockStageMap,
      components: mockStageMap.components.map((component) =>
        component.id === 'leaderboard_evaluation'
          ? {
              ...component,
              stages: [
                { id: 'build_leaderboard', description: 'Build leaderboard', status: 'completed' },
              ],
            }
          : component,
      ),
    };

    const rankedModels = {
      LightGBM_BAG_L2: mockModel('LightGBM_BAG_L2'),
      ExtraTreesGini_BAG_L2: {
        ...mockModel('ExtraTreesGini_BAG_L2'),
        metrics: { test_data: { accuracy: 0.75 } },
      },
    };

    const details = getPipelineSummaryDetails(mockPipelineRun, stageMap, rankedModels, {
      task_type: 'binary',
      eval_metric: 'accuracy',
    });

    expect(details.find((detail) => detail.label === 'Winning model')?.value).toBe(
      'LightGBM_BAG_L2',
    );
  });

  it('does not rank loaded models when task_type is unavailable and stage map has no best_model', () => {
    const stageMap: ComponentStageMap = {
      ...mockStageMap,
      components: mockStageMap.components.map((component) =>
        component.id === 'leaderboard_evaluation'
          ? {
              ...component,
              stages: [
                { id: 'build_leaderboard', description: 'Build leaderboard', status: 'completed' },
              ],
            }
          : component,
      ),
    };

    const details = getPipelineSummaryDetails(mockPipelineRun, stageMap, models, undefined);

    expect(details.find((detail) => detail.label === 'Winning model')?.value).toBe('—');
  });

  it('should not pick an arbitrary model when no loaded model has rank 1', () => {
    const stageMap: ComponentStageMap = {
      ...mockStageMap,
      components: mockStageMap.components.map((component) =>
        component.id === 'leaderboard_evaluation'
          ? {
              ...component,
              stages: [
                { id: 'build_leaderboard', description: 'Build leaderboard', status: 'completed' },
              ],
            }
          : component,
      ),
    };

    const computeRankMapSpy = jest
      .spyOn(utils, 'computeRankMap')
      .mockReturnValue({ LightGBM_BAG_L2: 2, ExtraTreesGini_BAG_L2: 3 });

    try {
      const details = getPipelineSummaryDetails(mockPipelineRun, stageMap, models, {
        task_type: 'binary',
        eval_metric: 'accuracy',
      });

      expect(details.find((detail) => detail.label === 'Winning model')?.value).toBe('—');
    } finally {
      computeRankMapSpy.mockRestore();
    }
  });
});

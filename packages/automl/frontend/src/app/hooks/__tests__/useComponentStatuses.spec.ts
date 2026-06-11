import type { PipelineRun } from '~/app/types';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import {
  componentIdToTaskId,
  getComponentsToFetch,
  mergeStatusIntoStageMap,
  isComponentFullyComplete,
} from '~/app/hooks/useComponentStatuses';
import type { ComponentStatusFile } from '~/app/hooks/useComponentStatuses';

/* eslint-disable camelcase */

// -- Fixtures based on real pipeline data --

const mockComponentStageMap: ComponentStageMap = {
  pipeline_id: 'autogluon-tabular-training-pipeline',
  description: 'Tabular AutoGluon pipeline',
  kfp_run_id: '029660b9-c210-4ad4-9434-de28c2c9baec',
  published_at: '2026-06-04T17:47:14.948493Z',
  components: [
    {
      id: 'automl_data_loader',
      description: 'Load tabular data',
      stages: [
        { id: 'validate_inputs', description: 'Validate pipeline inputs' },
        { id: 'read_and_sample', description: 'Read source data' },
        { id: 'cleanse', description: 'Apply cleansing rules' },
        { id: 'split', description: 'Split data' },
        { id: 'write_outputs', description: 'Write outputs' },
      ],
    },
    {
      id: 'autogluon_models_training',
      description: 'Train AutoGluon tabular models',
      stages: [
        { id: 'load_data', description: 'Load train/validation CSVs' },
        {
          id: 'model_selection',
          description: 'Run AutoGluon model selection',
          steps: ['feature_engineering', 'model_training', 'stacking', 'model_evaluation'],
        },
        { id: 'refit_full', description: 'Refit the best models' },
        { id: 'evaluate_models', description: 'Evaluate refit models' },
      ],
    },
    {
      id: 'leaderboard_evaluation',
      description: 'Build the AutoML leaderboard',
      stages: [{ id: 'build_leaderboard', description: 'Aggregate model metrics' }],
    },
  ],
};

const mockComponentStatus: ComponentStatusFile = {
  component_id: 'autogluon_models_training',
  started_at: '2026-06-04T17:49:19.223056Z',
  completed_at: '2026-06-04T17:50:10.290690Z',
  stages: [
    {
      id: 'load_data',
      description: 'Load train/validation CSVs',
      status: 'completed',
      timestamp: '2026-06-04T17:49:19.232065Z',
      train_rows: 213,
      test_rows: 179,
    },
    {
      id: 'model_selection',
      description: 'Run AutoGluon model selection',
      status: 'completed',
      timestamp: '2026-06-04T17:49:53.951525Z',
      top_n: 3,
      selected_models: ['ExtraTreesGini_BAG_L2', 'LightGBM_BAG_L2', 'LightGBMLarge_BAG_L2'],
      steps: ['feature_engineering', 'model_training', 'stacking', 'model_evaluation'],
    },
    {
      id: 'refit_full',
      description: 'Refit the best models',
      status: 'completed',
      timestamp: '2026-06-04T17:50:02.238567Z',
      model_count: 3,
    },
    {
      id: 'evaluate_models',
      description: 'Evaluate refit models',
      status: 'completed',
      timestamp: '2026-06-04T17:50:10.290550Z',
      eval_metric: 'accuracy',
    },
  ],
  metadata: {},
};

const createMockPipelineRun = (
  state: string,
  taskDetails: { task_id: string; display_name?: string; state?: string }[] = [],
): PipelineRun =>
  ({
    run_id: 'run-123',
    display_name: 'Test Run',
    state,
    created_at: '2025-01-17T00:00:00Z',
    run_details: {
      task_details: taskDetails.map((td) => ({
        run_id: 'run-123',
        task_id: td.task_id,
        display_name: td.display_name ?? td.task_id,
        create_time: '2025-01-17T00:00:00Z',
        start_time: '2025-01-17T00:00:00Z',
        end_time: '2025-01-17T00:00:00Z',
        state: td.state,
      })),
    },
  }) as PipelineRun;

// -- Tests --

describe('componentIdToTaskId', () => {
  it('should convert underscores to hyphens', () => {
    expect(componentIdToTaskId('autogluon_models_training')).toBe('autogluon-models-training');
  });

  it('should handle ids with no underscores', () => {
    expect(componentIdToTaskId('leaderboard')).toBe('leaderboard');
  });

  it('should handle empty string', () => {
    expect(componentIdToTaskId('')).toBe('');
  });

  it('should handle multiple consecutive underscores', () => {
    expect(componentIdToTaskId('a__b___c')).toBe('a--b---c');
  });
});

describe('getComponentsToFetch', () => {
  it('should return empty array when componentStageMap is undefined', () => {
    const pipelineRun = createMockPipelineRun('RUNNING', []);
    expect(getComponentsToFetch(undefined, pipelineRun, new Set())).toEqual([]);
  });

  it('should return empty array when pipelineRun is undefined', () => {
    expect(getComponentsToFetch(mockComponentStageMap, undefined, new Set())).toEqual([]);
  });

  it('should return all component ids when run is SUCCEEDED', () => {
    const pipelineRun = createMockPipelineRun('SUCCEEDED', []);
    const result = getComponentsToFetch(mockComponentStageMap, pipelineRun, new Set());

    expect(result).toEqual([
      'automl_data_loader',
      'autogluon_models_training',
      'leaderboard_evaluation',
    ]);
  });

  it('should skip components already in completedComponentIds', () => {
    const pipelineRun = createMockPipelineRun('SUCCEEDED', []);
    const completed = new Set(['autogluon_models_training']);
    const result = getComponentsToFetch(mockComponentStageMap, pipelineRun, completed);

    expect(result).toEqual(['automl_data_loader', 'leaderboard_evaluation']);
  });

  it('should return only RUNNING or SUCCEEDED tasks when run is not SUCCEEDED', () => {
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
      { task_id: 'autogluon-models-training', state: 'RUNNING' },
      { task_id: 'leaderboard-evaluation', state: 'PENDING' },
    ]);
    const result = getComponentsToFetch(mockComponentStageMap, pipelineRun, new Set());

    expect(result).toEqual(['automl_data_loader', 'autogluon_models_training']);
  });

  it('should match tasks by display_name as well', () => {
    const pipelineRun = createMockPipelineRun('RUNNING', [
      {
        task_id: 'some-internal-id',
        display_name: 'automl-data-loader',
        state: 'SUCCEEDED',
      },
    ]);
    const result = getComponentsToFetch(mockComponentStageMap, pipelineRun, new Set());

    expect(result).toEqual(['automl_data_loader']);
  });

  it('should return empty array when no tasks match', () => {
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'unrelated-task', state: 'SUCCEEDED' },
    ]);
    const result = getComponentsToFetch(mockComponentStageMap, pipelineRun, new Set());

    expect(result).toEqual([]);
  });
});

describe('mergeStatusIntoStageMap', () => {
  it('should return stageMap unchanged when no status files match', () => {
    const result = mergeStatusIntoStageMap(mockComponentStageMap, new Map());
    expect(result).toEqual(mockComponentStageMap);
  });

  it('should merge status data into matching component stages', () => {
    const statusFiles = new Map([['autogluon_models_training', mockComponentStatus]]);
    const result = mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    const mergedComponent = result.components.find((c) => c.id === 'autogluon_models_training')!;
    expect(mergedComponent.started_at).toBe('2026-06-04T17:49:19.223056Z');
    expect(mergedComponent.completed_at).toBe('2026-06-04T17:50:10.290690Z');
    expect(mergedComponent.metadata).toEqual({});
  });

  it('should preserve original stage descriptions after merge', () => {
    const statusFiles = new Map([['autogluon_models_training', mockComponentStatus]]);
    const result = mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    const mergedComponent = result.components.find((c) => c.id === 'autogluon_models_training')!;
    expect(mergedComponent.stages[0].description).toBe('Load train/validation CSVs');
  });

  it('should add status fields to merged stages', () => {
    const statusFiles = new Map([['autogluon_models_training', mockComponentStatus]]);
    const result = mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    const mergedComponent = result.components.find((c) => c.id === 'autogluon_models_training')!;
    const loadDataStage = mergedComponent.stages.find((s) => s.id === 'load_data')!;

    expect(loadDataStage.status).toBe('completed');
    expect(loadDataStage.timestamp).toBe('2026-06-04T17:49:19.232065Z');
    expect(loadDataStage.train_rows).toBe(213);
    expect(loadDataStage.test_rows).toBe(179);
  });

  it('should leave unmatched components untouched', () => {
    const statusFiles = new Map([['autogluon_models_training', mockComponentStatus]]);
    const result = mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    const dataLoader = result.components.find((c) => c.id === 'automl_data_loader')!;
    expect(dataLoader).toEqual(mockComponentStageMap.components[0]);
  });

  it('should leave unmatched stages within a merged component untouched', () => {
    const partialStatus: ComponentStatusFile = {
      component_id: 'autogluon_models_training',
      stages: [
        {
          id: 'load_data',
          description: 'Load train/validation CSVs',
          status: 'completed',
          timestamp: '2026-06-04T17:49:19Z',
        },
      ],
    };
    const statusFiles = new Map([['autogluon_models_training', partialStatus]]);
    const result = mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    const mergedComponent = result.components.find((c) => c.id === 'autogluon_models_training')!;
    const refitStage = mergedComponent.stages.find((s) => s.id === 'refit_full')!;
    expect(refitStage.status).toBeUndefined();
  });

  it('should not mutate the original stageMap', () => {
    const originalJson = JSON.stringify(mockComponentStageMap);
    const statusFiles = new Map([['autogluon_models_training', mockComponentStatus]]);
    mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    expect(JSON.stringify(mockComponentStageMap)).toBe(originalJson);
  });
});

describe('isComponentFullyComplete', () => {
  it('should return true when all stages are completed', () => {
    expect(isComponentFullyComplete(mockComponentStatus)).toBe(true);
  });

  it('should return false when some stages are not completed', () => {
    const partial: ComponentStatusFile = {
      component_id: 'test',
      stages: [
        { id: 'a', status: 'completed', description: 'A' },
        { id: 'b', status: 'running', description: 'B' },
      ],
    };
    expect(isComponentFullyComplete(partial)).toBe(false);
  });

  it('should return false when stages array is empty', () => {
    const empty: ComponentStatusFile = {
      component_id: 'test',
      stages: [],
    };
    expect(isComponentFullyComplete(empty)).toBe(false);
  });

  it('should return false when a stage has no status', () => {
    const noStatus: ComponentStatusFile = {
      component_id: 'test',
      stages: [
        { id: 'a', status: 'completed', description: 'A' },
        { id: 'b', description: 'B' },
      ],
    };
    expect(isComponentFullyComplete(noStatus)).toBe(false);
  });
});

/* eslint-enable camelcase */

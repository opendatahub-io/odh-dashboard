import { renderHook, waitFor } from '@testing-library/react';
import type { PipelineRun } from '~/app/types';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import { useS3ListFilesQuery } from '~/app/hooks/queries';
import { getFiles } from '~/app/api/s3';
import {
  buildRunLevelPrefixesFromTaskDetails,
  componentIdToTaskId,
  findComponentTaskInRunDetails,
  getComponentsToFetch,
  isKfpDriverTaskName,
  mergeStageWithStatus,
  mergeStatusIntoStageMap,
  isComponentFullyComplete,
  matchesComponentTaskName,
  resolveActiveRunLevelPrefix,
  resolveComponentTaskS3Prefix,
  ComponentStatusFileSchema,
  useComponentStatuses,
} from '~/app/hooks/useComponentStatuses';
import type { ComponentStatusFile } from '~/app/hooks/useComponentStatuses';
import { MAX_MODEL_SELECTION_STEPS } from '~/app/topology/stageMapConstants';

jest.mock('~/app/hooks/queries', () => ({
  useS3ListFilesQuery: jest.fn(),
}));

jest.mock('~/app/api/s3', () => ({
  getFiles: jest.fn(),
}));

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

  it('should normalize run and task state casing and whitespace', () => {
    const pipelineRun = createMockPipelineRun(' succeeded ', [
      { task_id: 'automl-data-loader', state: ' succeeded ' },
    ]);
    expect(getComponentsToFetch(mockComponentStageMap, pipelineRun, new Set())).toEqual([
      'automl_data_loader',
      'autogluon_models_training',
      'leaderboard_evaluation',
    ]);

    const runningRun = createMockPipelineRun('running', [
      { task_id: 'automl-data-loader', state: ' Succeeded ' },
      { task_id: 'autogluon-models-training', state: 'running' },
      { task_id: 'leaderboard-evaluation', state: 'pending' },
    ]);
    expect(getComponentsToFetch(mockComponentStageMap, runningRun, new Set())).toEqual([
      'automl_data_loader',
      'autogluon_models_training',
    ]);
  });

  it('should skip components already in completedComponentIds', () => {
    const pipelineRun = createMockPipelineRun('SUCCEEDED', []);
    const completed = new Set(['autogluon_models_training']);
    const result = getComponentsToFetch(mockComponentStageMap, pipelineRun, completed);

    expect(result).toEqual(['automl_data_loader', 'leaderboard_evaluation']);
  });

  it('should return RUNNING, SUCCEEDED, or FAILED tasks when run is not SUCCEEDED', () => {
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
      { task_id: 'autogluon-models-training', state: 'RUNNING' },
      { task_id: 'leaderboard-evaluation', state: 'PENDING' },
    ]);
    const result = getComponentsToFetch(mockComponentStageMap, pipelineRun, new Set());

    expect(result).toEqual(['automl_data_loader', 'autogluon_models_training']);
  });

  it('should include FAILED tasks when the run has not succeeded', () => {
    const pipelineRun = createMockPipelineRun('FAILED', [
      { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
      { task_id: 'autogluon-models-training-2', state: 'FAILED' },
      { task_id: 'leaderboard-evaluation', state: 'PENDING' },
    ]);
    const result = getComponentsToFetch(mockComponentStageMap, pipelineRun, new Set());

    expect(result).toEqual(['automl_data_loader', 'autogluon_models_training']);
  });

  it('should include CANCELED tasks when the run is terminal but not SUCCEEDED', () => {
    const pipelineRun = createMockPipelineRun('CANCELED', [
      { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
      { task_id: 'autogluon-models-training', state: 'CANCELED' },
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

  it('should match suffixed task directory names from condition branches', () => {
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'autogluon-models-training-2', state: 'RUNNING' },
      { task_id: 'leaderboard-evaluation-2', state: 'PENDING' },
    ]);
    const result = getComponentsToFetch(mockComponentStageMap, pipelineRun, new Set());

    expect(result).toEqual(['autogluon_models_training']);
  });
});

describe('matchesComponentTaskName', () => {
  it('should match exact and branch-suffixed task names', () => {
    expect(matchesComponentTaskName('autogluon-models-training', 'autogluon_models_training')).toBe(
      true,
    );
    expect(
      matchesComponentTaskName('autogluon-models-training-2', 'autogluon_models_training'),
    ).toBe(true);
    expect(matchesComponentTaskName('other-task', 'autogluon_models_training')).toBe(false);
  });

  it('should reject non-branch suffixes', () => {
    expect(
      matchesComponentTaskName('autogluon-models-training-backup', 'autogluon_models_training'),
    ).toBe(false);
  });
});

describe('isKfpDriverTaskName', () => {
  it('should identify KFP driver tasks', () => {
    expect(isKfpDriverTaskName('autogluon-models-training-2-driver')).toBe(true);
    expect(isKfpDriverTaskName('automl-data-loader-driver')).toBe(true);
    expect(isKfpDriverTaskName('autogluon-models-training-2')).toBe(false);
  });
});

describe('findComponentTaskInRunDetails', () => {
  it('should skip driver tasks and return the executor task status', () => {
    const taskDetails = [
      { task_id: 'autogluon-models-training-2-driver', state: 'SUCCEEDED' },
      { task_id: 'autogluon-models-training-2', state: 'FAILED' },
    ];

    expect(findComponentTaskInRunDetails(taskDetails, 'autogluon_models_training')).toEqual({
      task_id: 'autogluon-models-training-2',
      state: 'FAILED',
    });
  });

  it('should resolve data loader status from the executor task when driver succeeded first', () => {
    const taskDetails = [
      { task_id: 'automl-data-loader-driver', state: 'SUCCEEDED' },
      { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
    ];

    expect(findComponentTaskInRunDetails(taskDetails, 'automl_data_loader')).toEqual({
      task_id: 'automl-data-loader',
      state: 'SUCCEEDED',
    });
  });
});

describe('buildRunLevelPrefixesFromTaskDetails', () => {
  it('should build branch-suffixed prefixes from executor task names and skip drivers', () => {
    const prefixes = buildRunLevelPrefixesFromTaskDetails(
      'autogluon-tabular-training-pipeline',
      'run-123',
      [
        { task_id: 'autogluon-models-training-2-driver', state: 'SUCCEEDED' },
        { task_id: 'autogluon-models-training-2', state: 'RUNNING' },
        { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
      ],
    );

    expect(prefixes).toEqual([
      { prefix: 'autogluon-tabular-training-pipeline/run-123/autogluon-models-training-2/' },
      { prefix: 'autogluon-tabular-training-pipeline/run-123/automl-data-loader/' },
    ]);
  });
});

describe('resolveActiveRunLevelPrefix', () => {
  it('should resolve the executor task directory for an active branch-suffixed component', () => {
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'autogluon-models-training-2', state: 'RUNNING' },
    ]);

    expect(
      resolveActiveRunLevelPrefix(
        'autogluon-tabular-training-pipeline',
        'run-123',
        mockComponentStageMap,
        pipelineRun,
      ),
    ).toBe('autogluon-tabular-training-pipeline/run-123/autogluon-models-training-2');
  });

  it('should resolve suffixed task directories through run-level prefix discovery', () => {
    const prefixes = buildRunLevelPrefixesFromTaskDetails(
      'autogluon-tabular-training-pipeline',
      'run-123',
      [{ task_id: 'autogluon-models-training-2', state: 'RUNNING' }],
    );

    expect(
      resolveComponentTaskS3Prefix(
        'autogluon-tabular-training-pipeline',
        'run-123',
        'autogluon_models_training',
        prefixes,
      ),
    ).toBe('autogluon-tabular-training-pipeline/run-123/autogluon-models-training-2');
  });
});

describe('resolveComponentTaskS3Prefix', () => {
  it('should resolve suffixed task directories from run-level prefixes', () => {
    const prefixes = [
      { prefix: 'autogluon-tabular-training-pipeline/run-123/automl-data-loader/' },
      { prefix: 'autogluon-tabular-training-pipeline/run-123/autogluon-models-training-2/' },
    ];

    expect(
      resolveComponentTaskS3Prefix(
        'autogluon-tabular-training-pipeline',
        'run-123',
        'autogluon_models_training',
        prefixes,
      ),
    ).toBe('autogluon-tabular-training-pipeline/run-123/autogluon-models-training-2');
  });

  it('should fall back to the base task path when no run-level prefix matches', () => {
    expect(
      resolveComponentTaskS3Prefix(
        'autogluon-tabular-training-pipeline',
        'run-123',
        'automl_data_loader',
      ),
    ).toBe('autogluon-tabular-training-pipeline/run-123/automl-data-loader');
  });

  it('should return undefined when run-level discovery succeeded with no prefixes', () => {
    expect(
      resolveComponentTaskS3Prefix(
        'autogluon-tabular-training-pipeline',
        'run-123',
        'autogluon_models_training',
        [],
      ),
    ).toBeUndefined();
  });

  it('should ignore non-numeric sibling prefixes and fall back to the base task path', () => {
    const prefixes = [
      { prefix: 'autogluon-tabular-training-pipeline/run-123/autogluon-models-training-backup/' },
    ];

    expect(
      resolveComponentTaskS3Prefix(
        'autogluon-tabular-training-pipeline',
        'run-123',
        'autogluon_models_training',
        prefixes,
      ),
    ).toBe('autogluon-tabular-training-pipeline/run-123/autogluon-models-training');
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

  it('should flatten nested stage metadata onto merged stages', () => {
    const statusWithNestedMetadata: ComponentStatusFile = {
      component_id: 'autogluon_models_training',
      stages: [
        {
          id: 'load_data',
          description: 'Load train/validation CSVs',
          status: 'completed',
          timestamp: '2026-06-04T17:49:19.232065Z',
          metadata: {
            train_rows: 500,
            test_rows: 125,
          },
        },
      ],
    };
    const statusFiles = new Map([['autogluon_models_training', statusWithNestedMetadata]]);
    const result = mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    const loadDataStage = result.components
      .find((component) => component.id === 'autogluon_models_training')!
      .stages.find((stage) => stage.id === 'load_data')!;

    expect(loadDataStage.train_rows).toBe(500);
    expect(loadDataStage.test_rows).toBe(125);
    expect(loadDataStage.metadata).toBeUndefined();
  });

  it('should merge nested stage metadata via mergeStageWithStatus', () => {
    const merged = mergeStageWithStatus(
      { id: 'load_data', description: 'Load train/validation CSVs' },
      {
        id: 'load_data',
        description: 'ignored',
        status: 'completed',
        metadata: { train_rows: 42 },
      },
    );

    expect(merged.description).toBe('Load train/validation CSVs');
    expect(merged.status).toBe('completed');
    expect(merged.train_rows).toBe(42);
    expect(merged.metadata).toBeUndefined();
  });

  it('should not let nested metadata overwrite top-level status and timestamp', () => {
    const statusWithCollidingMetadata: ComponentStatusFile = {
      component_id: 'autogluon_models_training',
      stages: [
        {
          id: 'load_data',
          description: 'Load train/validation CSVs',
          status: 'completed',
          timestamp: '2026-06-04T17:49:19.232065Z',
          metadata: {
            status: 'pending',
            timestamp: '2026-01-01T00:00:00.000000Z',
            train_rows: 500,
            test_rows: 125,
          },
        },
      ],
    };
    const statusFiles = new Map([['autogluon_models_training', statusWithCollidingMetadata]]);
    const result = mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    const loadDataStage = result.components
      .find((component) => component.id === 'autogluon_models_training')!
      .stages.find((stage) => stage.id === 'load_data')!;

    expect(loadDataStage.status).toBe('completed');
    expect(loadDataStage.timestamp).toBe('2026-06-04T17:49:19.232065Z');
    expect(loadDataStage.train_rows).toBe(500);
    expect(loadDataStage.test_rows).toBe(125);
    expect(loadDataStage.metadata).toBeUndefined();

    const merged = mergeStageWithStatus(
      { id: 'load_data', description: 'Load train/validation CSVs' },
      statusWithCollidingMetadata.stages[0],
    );

    expect(merged.status).toBe('completed');
    expect(merged.timestamp).toBe('2026-06-04T17:49:19.232065Z');
    expect(merged.train_rows).toBe(500);
    expect(merged.test_rows).toBe(125);
    expect(merged.metadata).toBeUndefined();
  });

  it('should reject unsafe and protected keys when flattening nested stage fields', () => {
    const maliciousMetadata = {
      steps: ['evil_step'],
      selected_models: ['EvilModel'],
      train_rows: 500,
      constructor: { polluted: true },
      prototype: { polluted: true },
      ...JSON.parse('{"__proto__":{"polluted":true}}'),
    };

    const merged = mergeStageWithStatus(
      {
        id: 'model_selection',
        description: 'Run AutoGluon model selection',
        steps: ['feature_engineering', 'model_training'],
      },
      {
        id: 'model_selection',
        description: 'ignored',
        status: 'completed',
        timestamp: '2026-06-04T17:49:53.951525Z',
        selected_models: ['LightGBM_BAG_L2'],
        metadata: maliciousMetadata,
      },
    );

    expect(merged.status).toBe('completed');
    expect(merged.timestamp).toBe('2026-06-04T17:49:53.951525Z');
    expect(merged.steps).toEqual(['feature_engineering', 'model_training']);
    expect(merged.selected_models).toEqual(['LightGBM_BAG_L2']);
    expect(merged.train_rows).toBe(500);
    expect(merged.metadata).toBeUndefined();

    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect(Object.hasOwn(merged, 'constructor')).toBe(false);
    expect(Object.hasOwn(merged, 'prototype')).toBe(false);
    expect(Object.hasOwn(merged, '__proto__')).toBe(false);
    expect(merged).not.toHaveProperty('polluted');
    expect(Object.prototype).toEqual(expect.not.objectContaining({ polluted: true }));
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

  it('should merge leaderboard best_model when status stage omits description', () => {
    const leaderboardStatus: ComponentStatusFile = {
      component_id: 'leaderboard_evaluation',
      stages: [
        {
          id: 'build_leaderboard',
          status: 'completed',
          timestamp: '2026-06-04T17:50:15.000000Z',
          best_model: 'LightGBM_BAG_L2',
        },
      ],
    };

    expect(() => ComponentStatusFileSchema.parse(leaderboardStatus)).not.toThrow();

    const result = mergeStatusIntoStageMap(
      mockComponentStageMap,
      new Map([['leaderboard_evaluation', leaderboardStatus]]),
    );

    const buildLeaderboard = result.components
      .find((component) => component.id === 'leaderboard_evaluation')!
      .stages.find((stage) => stage.id === 'build_leaderboard')!;

    expect(buildLeaderboard.description).toBe('Aggregate model metrics');
    expect(buildLeaderboard.best_model).toBe('LightGBM_BAG_L2');
  });

  it('should truncate oversized model_selection steps during status parsing', () => {
    const oversizedSteps = Array.from(
      { length: MAX_MODEL_SELECTION_STEPS + 5 },
      (_, index) => `step_${index}`,
    );
    const parsed = ComponentStatusFileSchema.parse({
      component_id: 'autogluon_models_training',
      stages: [
        {
          id: 'model_selection',
          steps: oversizedSteps,
        },
      ],
    });

    expect(parsed.stages[0].steps).toHaveLength(MAX_MODEL_SELECTION_STEPS);
    expect(parsed.stages[0].steps).toEqual(oversizedSteps.slice(0, MAX_MODEL_SELECTION_STEPS));
  });

  it('should dedupe repeated model_selection steps before applying the cap', () => {
    const repeatedSteps = [
      ...Array.from({ length: MAX_MODEL_SELECTION_STEPS }, () => 'feature_engineering'),
      'model_training',
      'stacking',
    ];
    const parsed = ComponentStatusFileSchema.parse({
      component_id: 'autogluon_models_training',
      stages: [
        {
          id: 'model_selection',
          steps: repeatedSteps,
        },
      ],
    });

    expect(parsed.stages[0].steps).toEqual(['feature_engineering', 'model_training', 'stacking']);

    const merged = mergeStageWithStatus(
      {
        id: 'model_selection',
        description: 'Train candidate models',
        steps: repeatedSteps,
      },
      parsed.stages[0],
    );

    expect(merged.steps).toEqual(['feature_engineering', 'model_training', 'stacking']);
  });

  it('should reject malformed selected_models during status parsing', () => {
    const objectParsed = ComponentStatusFileSchema.parse({
      component_id: 'autogluon_models_training',
      stages: [
        {
          id: 'model_selection',
          selected_models: { model_a: 'ExtraTreesGini_BAG_L2' },
        },
      ],
    });
    expect(objectParsed.stages[0].selected_models).toBeUndefined();

    const mixedParsed = ComponentStatusFileSchema.parse({
      component_id: 'autogluon_models_training',
      stages: [
        {
          id: 'model_selection',
          selected_models: ['LightGBM_BAG_L2', 42, null],
        },
      ],
    });
    expect(mixedParsed.stages[0].selected_models).toEqual(['LightGBM_BAG_L2']);

    const emptyParsed = ComponentStatusFileSchema.parse({
      component_id: 'autogluon_models_training',
      stages: [
        {
          id: 'model_selection',
          selected_models: [],
        },
      ],
    });
    expect(emptyParsed.stages[0].selected_models).toEqual([]);
  });

  it('should normalize documented stage statuses and drop unsupported ones during parsing', () => {
    const parsed = ComponentStatusFileSchema.parse({
      component_id: 'autogluon_models_training',
      stages: [
        { id: 'load_data', status: ' Completed ' },
        { id: 'model_selection', status: 'STARTED' },
        { id: 'refit_full', status: 'running' },
        { id: 'build_leaderboard', status: 'pending' },
      ],
    });

    expect(parsed.stages[0].status).toBe('completed');
    expect(parsed.stages[1].status).toBe('started');
    expect(parsed.stages[2].status).toBeUndefined();
    expect(parsed.stages[3].status).toBeUndefined();
  });

  it('should not let unsupported status overwrite completed or failed canonical stages', () => {
    const completedPreserved = mergeStageWithStatus(
      { id: 'load_data', description: 'Load data', status: 'completed' },
      {
        id: 'load_data',
        status: 'running',
        timestamp: '2026-06-04T17:49:19.232065Z',
      } as unknown as ComponentStatusFile['stages'][number],
    );
    expect(completedPreserved.status).toBe('completed');
    expect(completedPreserved.timestamp).toBe('2026-06-04T17:49:19.232065Z');

    const failedPreserved = mergeStageWithStatus(
      { id: 'load_data', description: 'Load data', status: 'failed' },
      {
        id: 'load_data',
        status: 'pending',
      } as unknown as ComponentStatusFile['stages'][number],
    );
    expect(failedPreserved.status).toBe('failed');

    const progressed = mergeStageWithStatus(
      { id: 'load_data', description: 'Load data', status: 'started' },
      { id: 'load_data', status: 'completed' },
    );
    expect(progressed.status).toBe('completed');
  });

  it('should clear canonical selected_models when status provides an empty array', () => {
    const merged = mergeStageWithStatus(
      {
        id: 'model_selection',
        description: 'Run AutoGluon model selection',
        selected_models: ['ExistingModel'],
      },
      {
        id: 'model_selection',
        status: 'completed',
        selected_models: [],
      },
    );

    expect(merged.selected_models).toEqual([]);
    expect(merged.status).toBe('completed');
  });

  it('should not clear canonical selected_models when a non-empty array has no valid strings', () => {
    const nonStringParsed = ComponentStatusFileSchema.parse({
      component_id: 'autogluon_models_training',
      stages: [
        {
          id: 'model_selection',
          selected_models: [42, null],
        },
      ],
    });
    expect(nonStringParsed.stages[0].selected_models).toBeUndefined();

    const merged = mergeStageWithStatus(
      {
        id: 'model_selection',
        description: 'Run AutoGluon model selection',
        selected_models: ['ExistingModel'],
      },
      {
        id: 'model_selection',
        status: 'completed',
        selected_models: [42, null],
      } as unknown as ComponentStatusFile['stages'][number],
    );

    expect(merged.selected_models).toEqual(['ExistingModel']);
    expect(merged.status).toBe('completed');
  });

  it('should not merge malformed selected_models into branch metadata', () => {
    const merged = mergeStageWithStatus(
      {
        id: 'model_selection',
        description: 'Run AutoGluon model selection',
        selected_models: ['ExistingModel'],
      },
      {
        id: 'model_selection',
        status: 'completed',
        selected_models: { bad: 'value' },
      } as unknown as ComponentStatusFile['stages'][number],
    );

    expect(merged.selected_models).toEqual(['ExistingModel']);
    expect(merged.status).toBe('completed');
  });
});

describe('useComponentStatuses', () => {
  const useS3ListFilesQueryMock = jest.mocked(useS3ListFilesQuery);
  const getFilesMock = jest.mocked(getFiles);
  const dataUpdatedAt = 1_700_000_000_000;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    useS3ListFilesQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useS3ListFilesQuery>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should populate errors when all component status fetches fail', async () => {
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
      { task_id: 'autogluon-models-training-2', state: 'RUNNING' },
    ]);

    getFilesMock.mockRejectedValue(new Error('S3 unavailable'));

    const { result } = renderHook(() =>
      useComponentStatuses(
        'run-123',
        'test-namespace',
        pipelineRun,
        mockComponentStageMap,
        dataUpdatedAt,
      ),
    );

    await waitFor(() => {
      expect(result.current.errors).toEqual([
        { componentId: 'automl_data_loader', message: 'S3 unavailable' },
        { componentId: 'autogluon_models_training', message: 'S3 unavailable' },
      ]);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.mergedStageMap).toEqual(mockComponentStageMap);
  });

  it('should clear stale errors when a later fetch returns missing status', async () => {
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
      { task_id: 'autogluon-models-training-2', state: 'RUNNING' },
    ]);

    getFilesMock.mockRejectedValue(new Error('S3 unavailable'));

    const { result, rerender } = renderHook(
      ({ updatedAt }) =>
        useComponentStatuses(
          'run-123',
          'test-namespace',
          pipelineRun,
          mockComponentStageMap,
          updatedAt,
        ),
      { initialProps: { updatedAt: dataUpdatedAt } },
    );

    await waitFor(() => {
      expect(result.current.errors).toEqual([
        { componentId: 'automl_data_loader', message: 'S3 unavailable' },
        { componentId: 'autogluon_models_training', message: 'S3 unavailable' },
      ]);
    });

    getFilesMock.mockResolvedValue({
      contents: [],
      common_prefixes: [],
      is_truncated: false,
      key_count: 0,
      max_keys: 1000,
    });

    rerender({ updatedAt: dataUpdatedAt + 1 });

    await waitFor(() => {
      expect(result.current.errors).toEqual([]);
    });
    expect(result.current.mergedStageMap).toEqual(mockComponentStageMap);
  });

  it('should settle loading when namespace is unavailable', () => {
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
      { task_id: 'autogluon-models-training-2', state: 'RUNNING' },
    ]);

    const { result } = renderHook(() =>
      useComponentStatuses('run-123', undefined, pipelineRun, mockComponentStageMap, dataUpdatedAt),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.mergedStageMap).toEqual(mockComponentStageMap);
    expect(getFilesMock).not.toHaveBeenCalled();
  });

  it('should reset status caches when namespace changes for the same runId', async () => {
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
      { task_id: 'autogluon-models-training-2', state: 'RUNNING' },
    ]);

    getFilesMock.mockRejectedValue(new Error('S3 unavailable'));

    const { result, rerender } = renderHook(
      ({ namespace }) =>
        useComponentStatuses(
          'run-123',
          namespace,
          pipelineRun,
          mockComponentStageMap,
          dataUpdatedAt,
        ),
      { initialProps: { namespace: 'project-a' } },
    );

    await waitFor(() => {
      expect(result.current.errors).toEqual([
        { componentId: 'automl_data_loader', message: 'S3 unavailable' },
        { componentId: 'autogluon_models_training', message: 'S3 unavailable' },
      ]);
    });

    getFilesMock.mockResolvedValue({
      contents: [],
      common_prefixes: [],
      is_truncated: false,
      key_count: 0,
      max_keys: 1000,
    });

    rerender({ namespace: 'project-b' });

    await waitFor(() => {
      expect(result.current.errors).toEqual([]);
    });
    expect(result.current.mergedStageMap).toEqual(mockComponentStageMap);
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
        { id: 'b', status: 'started', description: 'B' },
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

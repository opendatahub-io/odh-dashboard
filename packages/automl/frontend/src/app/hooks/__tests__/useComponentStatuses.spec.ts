/* eslint-disable camelcase */

import { renderHook, waitFor } from '@testing-library/react';
import {
  buildRunLevelPrefixesFromTaskDetails,
  componentIdToTaskId,
  ComponentStatusFileSchema,
  findComponentTaskInRunDetails,
  getComponentsToFetch,
  isComponentFullyComplete,
  isKfpDriverTaskName,
  mergeStageWithStatus,
  mergeStatusIntoStageMap,
  matchesComponentTaskName,
  resolveActiveRunLevelPrefix,
  resolveComponentTaskS3Prefix,
  useComponentStatuses,
} from '~/app/hooks/useComponentStatuses';
import { useS3ListFilesQuery } from '~/app/hooks/queries';
import { getFiles } from '~/app/api/s3';
import type { PipelineRun } from '~/app/types';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';

jest.mock('~/app/hooks/queries', () => ({ useS3ListFilesQuery: jest.fn() }));
jest.mock('~/app/api/s3', () => ({ getFiles: jest.fn() }));

const stageMap: ComponentStageMap = {
  pipeline_id: 'pipeline',
  description: 'Pipeline',
  kfp_run_id: 'run',
  published_at: '2026-01-01T00:00:00Z',
  components: [
    {
      id: 'training_component',
      description: 'Training component',
      stages: [
        { id: 'load_data', description: 'Load data', steps: ['load', 'train'] },
        {
          id: 'model_selection',
          description: 'Train models',
          steps: ['train'],
          selected_models: ['map-model'],
        },
        { id: 'publish', description: 'Publish results' },
      ],
    },
  ],
};

const artifact = (stages: unknown[], metadata = { display_name: 'Model training' }) =>
  ComponentStatusFileSchema.parse({
    component_id: 'training_component',
    started_at: '2026-01-01T00:00:00Z',
    metadata,
    stages,
  });

const mockComponentStageMap: ComponentStageMap = {
  pipeline_id: 'autogluon-tabular-training-pipeline',
  description: 'Tabular AutoGluon pipeline',
  kfp_run_id: 'run-123',
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

const mockComponentStatus = ComponentStatusFileSchema.parse({
  component_id: 'autogluon_models_training',
  started_at: '2026-06-04T17:49:19.223056Z',
  completed_at: '2026-06-04T17:50:10.290690Z',
  metadata: { display_name: 'Training' },
  stages: [
    {
      id: 'load_data',
      status: { state: 'completed' },
      metrics: { train_rows: 213, test_rows: 179 },
    },
    {
      id: 'model_selection',
      status: { state: 'completed' },
      metrics: { selected_models: ['ExtraTreesGini_BAG_L2', 'LightGBM_BAG_L2'] },
    },
    { id: 'refit_full', status: { state: 'completed' }, metrics: { model_count: 3 } },
    { id: 'evaluate_models', status: { state: 'completed' }, metrics: { eval_metric: 'accuracy' } },
  ],
});

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
      task_details: taskDetails.map((task) => ({
        run_id: 'run-123',
        task_id: task.task_id,
        display_name: task.display_name ?? task.task_id,
        create_time: '2025-01-17T00:00:00Z',
        start_time: '2025-01-17T00:00:00Z',
        end_time: '2025-01-17T00:00:00Z',
        state: task.state,
      })),
    },
  }) as PipelineRun;

describe('component task discovery and prefixes', () => {
  it.each([
    ['autogluon_models_training', 'autogluon-models-training'],
    ['leaderboard', 'leaderboard'],
    ['', ''],
    ['a__b___c', 'a--b---c'],
  ])('converts component id %s', (id, expected) => expect(componentIdToTaskId(id)).toBe(expected));

  it('filters components by run and task state', () => {
    expect(getComponentsToFetch(undefined, createMockPipelineRun('RUNNING'), new Set())).toEqual(
      [],
    );
    expect(getComponentsToFetch(mockComponentStageMap, undefined, new Set())).toEqual([]);
    expect(
      getComponentsToFetch(mockComponentStageMap, createMockPipelineRun('SUCCEEDED'), new Set()),
    ).toEqual(['automl_data_loader', 'autogluon_models_training', 'leaderboard_evaluation']);
    expect(
      getComponentsToFetch(
        mockComponentStageMap,
        createMockPipelineRun('running', [
          { task_id: 'automl-data-loader', state: ' Succeeded ' },
          { task_id: 'autogluon-models-training', state: 'running' },
          { task_id: 'leaderboard-evaluation', state: 'pending' },
        ]),
        new Set(),
      ),
    ).toEqual(['automl_data_loader', 'autogluon_models_training']);
    expect(
      getComponentsToFetch(
        mockComponentStageMap,
        createMockPipelineRun('FAILED', [
          { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
          { task_id: 'autogluon-models-training-2', state: 'FAILED' },
        ]),
        new Set(['automl_data_loader']),
      ),
    ).toEqual(['autogluon_models_training']);
  });

  it('matches display names and branch suffixes, but not arbitrary suffixes', () => {
    expect(
      getComponentsToFetch(
        mockComponentStageMap,
        createMockPipelineRun('RUNNING', [
          { task_id: 'internal', display_name: 'automl-data-loader', state: 'SUCCEEDED' },
          { task_id: 'autogluon-models-training-2', state: 'RUNNING' },
        ]),
        new Set(),
      ),
    ).toEqual(['automl_data_loader', 'autogluon_models_training']);
    expect(matchesComponentTaskName('autogluon-models-training', 'autogluon_models_training')).toBe(
      true,
    );
    expect(
      matchesComponentTaskName('autogluon-models-training-2', 'autogluon_models_training'),
    ).toBe(true);
    expect(
      matchesComponentTaskName('autogluon-models-training-backup', 'autogluon_models_training'),
    ).toBe(false);
  });

  it('skips driver tasks when resolving executor details', () => {
    const details = [
      { task_id: 'autogluon-models-training-2-driver', state: 'SUCCEEDED' },
      { task_id: 'autogluon-models-training-2', state: 'FAILED' },
    ];
    expect(findComponentTaskInRunDetails(details, 'autogluon_models_training')).toEqual(details[1]);
    expect(isKfpDriverTaskName(details[0].task_id)).toBe(true);
    expect(isKfpDriverTaskName(details[1].task_id)).toBe(false);
  });

  it('discovers branch prefixes and falls back safely', () => {
    const run = createMockPipelineRun('RUNNING', [
      { task_id: 'autogluon-models-training-2', state: 'RUNNING' },
    ]);
    const prefixes = buildRunLevelPrefixesFromTaskDetails('root', 'run-123', [
      { task_id: 'autogluon-models-training-2-driver' },
      { task_id: 'autogluon-models-training-2' },
      { task_id: 'automl-data-loader' },
    ]);
    expect(prefixes).toEqual([
      { prefix: 'root/run-123/autogluon-models-training-2/' },
      { prefix: 'root/run-123/automl-data-loader/' },
    ]);
    expect(resolveActiveRunLevelPrefix('root', 'run-123', mockComponentStageMap, run)).toBe(
      'root/run-123/autogluon-models-training-2',
    );
    expect(
      resolveComponentTaskS3Prefix('root', 'run-123', 'autogluon_models_training', prefixes),
    ).toBe('root/run-123/autogluon-models-training-2');
    expect(resolveComponentTaskS3Prefix('root', 'run-123', 'automl_data_loader')).toBe(
      'root/run-123/automl-data-loader',
    );
    expect(
      resolveComponentTaskS3Prefix('root', 'run-123', 'autogluon_models_training', []),
    ).toBeUndefined();
    expect(
      resolveComponentTaskS3Prefix('root', 'run-123', 'autogluon_models_training', [
        { prefix: 'root/run-123/autogluon-models-training-backup/' },
      ]),
    ).toBe('root/run-123/autogluon-models-training');
  });

  it('returns all component ids when the run is succeeded', () => {
    expect(
      getComponentsToFetch(mockComponentStageMap, createMockPipelineRun('SUCCEEDED'), new Set()),
    ).toEqual(['automl_data_loader', 'autogluon_models_training', 'leaderboard_evaluation']);
  });

  it('normalizes run and task state casing and whitespace', () => {
    expect(
      getComponentsToFetch(
        mockComponentStageMap,
        createMockPipelineRun(' succeeded ', [
          { task_id: 'automl-data-loader', state: ' succeeded ' },
        ]),
        new Set(),
      ),
    ).toEqual(['automl_data_loader', 'autogluon_models_training', 'leaderboard_evaluation']);
  });

  it('skips components already completed', () => {
    expect(
      getComponentsToFetch(
        mockComponentStageMap,
        createMockPipelineRun('SUCCEEDED'),
        new Set(['autogluon_models_training']),
      ),
    ).toEqual(['automl_data_loader', 'leaderboard_evaluation']);
  });

  it('includes failed tasks when the run has not succeeded', () => {
    expect(
      getComponentsToFetch(
        mockComponentStageMap,
        createMockPipelineRun('FAILED', [
          { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
          { task_id: 'autogluon-models-training-2', state: 'FAILED' },
        ]),
        new Set(),
      ),
    ).toEqual(['automl_data_loader', 'autogluon_models_training']);
  });

  it('returns no components when no tasks match', () => {
    expect(
      getComponentsToFetch(
        mockComponentStageMap,
        createMockPipelineRun('RUNNING', [{ task_id: 'unrelated-task', state: 'SUCCEEDED' }]),
        new Set(),
      ),
    ).toEqual([]);
  });

  it('returns no components when the stage map is undefined', () => {
    expect(getComponentsToFetch(undefined, createMockPipelineRun('RUNNING'), new Set())).toEqual(
      [],
    );
  });

  it('returns no components when the pipeline run is undefined', () => {
    expect(getComponentsToFetch(mockComponentStageMap, undefined, new Set())).toEqual([]);
  });

  it('matches tasks by display name', () => {
    expect(
      getComponentsToFetch(
        mockComponentStageMap,
        createMockPipelineRun('RUNNING', [
          { task_id: 'some-internal-id', display_name: 'automl-data-loader', state: 'SUCCEEDED' },
        ]),
        new Set(),
      ),
    ).toEqual(['automl_data_loader']);
  });

  it('matches suffixed task directories from branches', () => {
    expect(
      getComponentsToFetch(
        mockComponentStageMap,
        createMockPipelineRun('RUNNING', [
          { task_id: 'autogluon-models-training-2', state: 'RUNNING' },
        ]),
        new Set(),
      ),
    ).toEqual(['autogluon_models_training']);
  });

  it('matches exact and branch-suffixed task names', () => {
    expect(matchesComponentTaskName('autogluon-models-training', 'autogluon_models_training')).toBe(
      true,
    );
    expect(
      matchesComponentTaskName('autogluon-models-training-2', 'autogluon_models_training'),
    ).toBe(true);
    expect(matchesComponentTaskName('other-task', 'autogluon_models_training')).toBe(false);
  });

  it('identifies KFP driver tasks', () => {
    expect(isKfpDriverTaskName('automl-data-loader-driver')).toBe(true);
    expect(isKfpDriverTaskName('autogluon-models-training-2')).toBe(false);
  });

  it('resolves the executor when the driver appears first', () => {
    const details = [
      { task_id: 'automl-data-loader-driver', state: 'SUCCEEDED' },
      { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
    ];
    expect(findComponentTaskInRunDetails(details, 'automl_data_loader')).toEqual(details[1]);
  });

  it('builds branch prefixes from executor names and skips drivers', () => {
    expect(
      buildRunLevelPrefixesFromTaskDetails('root', 'run-123', [
        { task_id: 'autogluon-models-training-2-driver' },
        { task_id: 'autogluon-models-training-2' },
        { task_id: 'automl-data-loader' },
      ]),
    ).toEqual([
      { prefix: 'root/run-123/autogluon-models-training-2/' },
      { prefix: 'root/run-123/automl-data-loader/' },
    ]);
  });

  it('resolves the active executor task directory', () => {
    expect(
      resolveActiveRunLevelPrefix(
        'root',
        'run-123',
        mockComponentStageMap,
        createMockPipelineRun('RUNNING', [
          { task_id: 'autogluon-models-training-2', state: 'RUNNING' },
        ]),
      ),
    ).toBe('root/run-123/autogluon-models-training-2');
  });

  it('falls back to the base task path without a matching prefix', () => {
    expect(resolveComponentTaskS3Prefix('root', 'run-123', 'automl_data_loader')).toBe(
      'root/run-123/automl-data-loader',
    );
    expect(
      resolveComponentTaskS3Prefix('root', 'run-123', 'autogluon_models_training', [
        { prefix: 'root/run-123/autogluon-models-training-backup/' },
      ]),
    ).toBe('root/run-123/autogluon-models-training');
  });
});

describe('legacy merge and completion coverage with canonical status files', () => {
  it('merges matching components, preserves descriptions, and leaves unmatched data alone', () => {
    const result = mergeStatusIntoStageMap(
      mockComponentStageMap,
      new Map([['autogluon_models_training', mockComponentStatus]]),
    );
    const component = result.components[1];
    expect(component.started_at).toBe('2026-06-04T17:49:19.223056Z');
    expect(component.completed_at).toBe('2026-06-04T17:50:10.290690Z');
    expect(component.metadata).toEqual({ display_name: 'Training' });
    expect(component.stages[0].description).toBe('Load train/validation CSVs');
    expect(component.stages[0].metrics).toEqual({ train_rows: 213, test_rows: 179 });
    expect(result.components[0]).toEqual(mockComponentStageMap.components[0]);
  });

  it('keeps missing stages pending and does not mutate the map', () => {
    const original = JSON.stringify(mockComponentStageMap);
    const partial = ComponentStatusFileSchema.parse({
      component_id: 'autogluon_models_training',
      started_at: '2026-01-01T00:00:00Z',
      metadata: { display_name: 'Training' },
      stages: [{ id: 'load_data', status: { state: 'completed' } }],
    });
    const result = mergeStatusIntoStageMap(
      mockComponentStageMap,
      new Map([['autogluon_models_training', partial]]),
    );
    expect(result.components[1].stages[2].status).toBeUndefined();
    expect(JSON.stringify(mockComponentStageMap)).toBe(original);
  });

  it('merges leaderboard metrics without replacing map descriptions', () => {
    const status = ComponentStatusFileSchema.parse({
      component_id: 'leaderboard_evaluation',
      started_at: '2026-01-01T00:00:00Z',
      metadata: { display_name: 'Leaderboard' },
      stages: [
        {
          id: 'build_leaderboard',
          status: { state: 'completed' },
          metrics: { best_model: 'LightGBM_BAG_L2' },
        },
      ],
    });
    const stage = mergeStatusIntoStageMap(
      mockComponentStageMap,
      new Map([['leaderboard_evaluation', status]]),
    ).components[2].stages[0];
    expect(stage.description).toBe('Aggregate model metrics');
    expect(stage.metrics).toEqual({ best_model: 'LightGBM_BAG_L2' });
  });

  it('reports completion only for non-empty all-completed canonical stages', () => {
    expect(isComponentFullyComplete(mockComponentStatus)).toBe(true);
    const partial = ComponentStatusFileSchema.parse({
      component_id: 'test',
      started_at: '2026-01-01T00:00:00Z',
      metadata: { display_name: 'Test' },
      stages: [
        { id: 'a', status: { state: 'completed' } },
        { id: 'b', status: { state: 'started' } },
      ],
    });
    expect(isComponentFullyComplete(partial)).toBe(false);
    const empty = ComponentStatusFileSchema.parse({
      component_id: 'test',
      started_at: '2026-01-01T00:00:00Z',
      metadata: { display_name: 'Test' },
      stages: [],
    });
    expect(isComponentFullyComplete(empty)).toBe(false);
  });
});

describe('useComponentStatuses', () => {
  const queryMock = jest.mocked(useS3ListFilesQuery);
  const filesMock = jest.mocked(getFiles);
  const updatedAt = 1_700_000_000_000;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    queryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useS3ListFilesQuery>);
  });
  afterEach(() => jest.restoreAllMocks());

  it('reports errors and settles loading when status fetches fail', async () => {
    filesMock.mockRejectedValue(new Error('S3 unavailable'));
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
      { task_id: 'autogluon-models-training-2', state: 'RUNNING' },
    ]);
    const { result } = renderHook(() =>
      useComponentStatuses(
        'run-123',
        'test-namespace',
        pipelineRun,
        mockComponentStageMap,
        updatedAt,
      ),
    );
    await waitFor(() => expect(result.current.errors).toHaveLength(2));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mergedStageMap).toEqual(mockComponentStageMap);
  });

  it('clears stale errors when a later fetch finds no status', async () => {
    filesMock.mockRejectedValueOnce(new Error('S3 unavailable')).mockResolvedValue({
      contents: [],
      common_prefixes: [],
      is_truncated: false,
      key_count: 0,
      max_keys: 1000,
    });
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
    ]);
    const { result, rerender } = renderHook(
      ({ stamp }) =>
        useComponentStatuses(
          'run-123',
          'test-namespace',
          pipelineRun,
          mockComponentStageMap,
          stamp,
        ),
      { initialProps: { stamp: updatedAt } },
    );
    await waitFor(() => expect(result.current.errors).toHaveLength(1));
    rerender({ stamp: updatedAt + 1 });
    await waitFor(() => expect(result.current.errors).toEqual([]));
  });

  it('settles without fetching when namespace is unavailable', () => {
    const { result } = renderHook(() =>
      useComponentStatuses(
        'run-123',
        undefined,
        createMockPipelineRun('RUNNING'),
        mockComponentStageMap,
        updatedAt,
      ),
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.mergedStageMap).toEqual(mockComponentStageMap);
    expect(filesMock).not.toHaveBeenCalled();
  });

  it('resets errors when the namespace changes for the same run', async () => {
    filesMock.mockRejectedValueOnce(new Error('S3 unavailable')).mockResolvedValue({
      contents: [],
      common_prefixes: [],
      is_truncated: false,
      key_count: 0,
      max_keys: 1000,
    });
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
    ]);
    const { result, rerender } = renderHook(
      ({ namespace }) =>
        useComponentStatuses('run-123', namespace, pipelineRun, mockComponentStageMap, updatedAt),
      { initialProps: { namespace: 'project-a' } },
    );
    await waitFor(() => expect(result.current.errors).toHaveLength(1));
    rerender({ namespace: 'project-b' });
    await waitFor(() => expect(result.current.errors).toEqual([]));
  });
});

describe('ComponentStatusFileSchema', () => {
  it('should reject the legacy flat stage and string status shape', () => {
    expect(() =>
      ComponentStatusFileSchema.parse({
        component_id: 'training_component',
        started_at: '2026-01-01T00:00:00Z',
        metadata: { display_name: 'Training' },
        stages: [{ id: 'load_data', status: 'completed', row_count: 10 }],
      }),
    ).toThrow();
  });

  it('should require the canonical envelope and stage fields', () => {
    expect(() => ComponentStatusFileSchema.parse({ component_id: 'training_component' })).toThrow();
    expect(() =>
      ComponentStatusFileSchema.parse({
        component_id: 'training_component',
        started_at: '2026-01-01T00:00:00Z',
        metadata: {},
        stages: [],
      }),
    ).toThrow();
  });

  it('should parse running metrics, message, and status step', () => {
    const parsed = artifact([
      {
        id: 'load_data',
        status: {
          state: 'running',
          step: 'load',
          message: { level: 'info', text: 'Loading data' },
          running_at: '2026-01-01T00:01:00Z',
        },
        metrics: { completed_units: 3, total_units: 8, batches: [1, 2] },
      },
    ]);

    expect(parsed.stages[0]).toMatchObject({
      id: 'load_data',
      status: {
        state: 'running',
        step: 'load',
        message: { text: 'Loading data' },
      },
      metrics: { completed_units: 3, total_units: 8 },
    });
  });

  it('should accept an error only on a failed stage', () => {
    const failedStage = artifact([
      { id: 'model_selection', status: { state: 'failed' }, error: 'TRAIN_FAILED' },
    ]).stages[0];
    expect('error' in failedStage ? failedStage.error : undefined).toBe('TRAIN_FAILED');
    expect(() =>
      artifact([{ id: 'model_selection', status: { state: 'running' }, error: 'stale error' }]),
    ).toThrow();
  });

  it('should reject a missing envelope or required metadata', () => {
    expect(() => ComponentStatusFileSchema.parse({ component_id: 'training_component' })).toThrow();
    expect(() =>
      ComponentStatusFileSchema.parse({
        component_id: 'training_component',
        started_at: '2026-01-01T00:00:00Z',
        metadata: {},
        stages: [],
      }),
    ).toThrow();
  });

  it('should parse canonical running status, message, and metrics', () => {
    const parsed = artifact([
      {
        id: 'load_data',
        status: {
          state: 'running',
          step: 'load',
          message: { level: 'info', text: 'Loading data' },
          running_at: '2026-01-01T00:01:00Z',
        },
        metrics: { completed_units: 3, total_units: 8, batches: [1, 2] },
      },
    ]);
    expect(parsed.stages[0].status).toMatchObject({ state: 'running', step: 'load' });
    expect(parsed.stages[0].metrics).toEqual({
      completed_units: 3,
      total_units: 8,
      batches: [1, 2],
    });
  });

  it('should enforce canonical identifiers, timestamps, messages, errors, and metric values', () => {
    const valid = {
      component_id: 'training_component',
      started_at: '2026-01-01T00:00:00Z',
      metadata: { display_name: 'Training', extra: { retained: true } },
      stages: [
        {
          id: 'load_data',
          status: { state: 'running', running_at: '2026-01-01T00:01:00Z' },
          metrics: {
            string: 'value',
            number: 1.5,
            integer: 1,
            boolean: true,
            empty: null,
            values: ['value', 1, false],
          },
        },
      ],
    };
    expect(ComponentStatusFileSchema.parse(valid)).toEqual(valid);
    for (const [field, value] of [
      ['component_id', 'Training'],
      ['started_at', '2026-01-01T00:00:00+00:00'],
    ] as const) {
      expect(() => ComponentStatusFileSchema.parse({ ...valid, [field]: value })).toThrow();
    }
    expect(() =>
      ComponentStatusFileSchema.parse({
        ...valid,
        completed_at: 'not-a-timestamp',
        stages: [{ ...valid.stages[0], id: 'load-data' }],
      }),
    ).toThrow();
    expect(() =>
      ComponentStatusFileSchema.parse({
        ...valid,
        stages: [
          { ...valid.stages[0], status: { state: 'running', running_at: 'not-a-timestamp' } },
        ],
      }),
    ).toThrow();
    expect(() =>
      ComponentStatusFileSchema.parse({
        ...valid,
        stages: [
          {
            ...valid.stages[0],
            status: { state: 'running', message: { level: 'info', text: '' } },
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      ComponentStatusFileSchema.parse({
        ...valid,
        stages: [{ ...valid.stages[0], metrics: { object: {} } }],
      }),
    ).toThrow();
    expect(() =>
      ComponentStatusFileSchema.parse({
        ...valid,
        stages: [{ ...valid.stages[0], metrics: { values: ['value', null] } }],
      }),
    ).toThrow();
  });
});

describe('mergeStatusIntoStageMap', () => {
  it('should preserve stage descriptions and the complete map step catalog', () => {
    const merged = mergeStatusIntoStageMap(
      stageMap,
      new Map([
        [
          'training_component',
          artifact([
            {
              id: 'load_data',
              status: { state: 'running', step: 'not-in-map' },
              metrics: { completed_units: 2, total_units: 4 },
            },
          ]),
        ],
      ]),
    );
    const stage = merged.components[0].stages[0];
    expect(stage.description).toBe('Load data');
    expect(stage.steps).toEqual(['load', 'train']);
    expect(stage.status).toEqual({ state: 'running', step: undefined });
    expect(stage.metrics).toEqual({ completed_units: 2, total_units: 4 });
  });

  it('should use the component display name and retain failed error details', () => {
    const merged = mergeStatusIntoStageMap(
      stageMap,
      new Map([
        [
          'training_component',
          artifact([{ id: 'model_selection', status: { state: 'failed' }, error: 'Failed' }]),
        ],
      ]),
    );
    expect(merged.components[0].metadata).toEqual({ display_name: 'Model training' });
    expect(merged.components[0].stages[1].error).toBe('Failed');
  });

  it('should leave unrecorded stages pending in a partial artifact', () => {
    const merged = mergeStatusIntoStageMap(
      stageMap,
      new Map([
        ['training_component', artifact([{ id: 'load_data', status: { state: 'completed' } }])],
      ]),
    );
    expect(merged.components[0].stages).toHaveLength(3);
    expect(merged.components[0].stages[2].status).toBeUndefined();
  });

  it('should merge canonical stage data without flattening it', () => {
    const merged = mergeStageWithStatus(
      stageMap.components[0].stages[0],
      artifact([{ id: 'load_data', status: { state: 'running' }, metrics: { total_units: 2 } }])
        .stages[0],
    );
    expect(merged.metrics).toEqual({ total_units: 2 });
    expect(merged.total_units).toBeUndefined();
  });

  it('should promote canonical model selection metrics and preserve map selections when absent', () => {
    const selected = mergeStatusIntoStageMap(
      stageMap,
      new Map([
        [
          'training_component',
          artifact([
            {
              id: 'model_selection',
              status: { state: 'completed' },
              metrics: { selected_models: ['model-a', 'model-b'] },
            },
          ]),
        ],
      ]),
    );
    expect(selected.components[0].stages[1].selected_models).toEqual(['model-a', 'model-b']);

    const preserved = mergeStatusIntoStageMap(
      stageMap,
      new Map([
        [
          'training_component',
          artifact([{ id: 'model_selection', status: { state: 'completed' } }]),
        ],
      ]),
    );
    expect(preserved.components[0].stages[1].selected_models).toEqual(['map-model']);
  });

  it('should ignore malformed model selection metrics', () => {
    const merged = mergeStatusIntoStageMap(
      stageMap,
      new Map([
        [
          'training_component',
          artifact([
            {
              id: 'model_selection',
              status: { state: 'completed' },
              metrics: { selected_models: ['model-a', 1] },
            },
          ]),
        ],
      ]),
    );
    expect(merged.components[0].stages[1].selected_models).toEqual(['map-model']);
  });

  it('should return the map unchanged when no status files match', () => {
    expect(mergeStatusIntoStageMap(mockComponentStageMap, new Map())).toEqual(
      mockComponentStageMap,
    );
  });

  it('should leave unmatched stages untouched', () => {
    const result = mergeStatusIntoStageMap(
      mockComponentStageMap,
      new Map([
        [
          'autogluon_models_training',
          artifact([{ id: 'load_data', status: { state: 'completed' } }]),
        ],
      ]),
    );
    expect(
      result.components[1].stages.find((stage) => stage.id === 'refit_full')?.status,
    ).toBeUndefined();
  });

  it('should not mutate the original stage map', () => {
    const original = JSON.stringify(mockComponentStageMap);
    mergeStatusIntoStageMap(
      mockComponentStageMap,
      new Map([['autogluon_models_training', mockComponentStatus]]),
    );
    expect(JSON.stringify(mockComponentStageMap)).toBe(original);
  });

  it('should merge leaderboard metrics when the status omits its description', () => {
    const status = ComponentStatusFileSchema.parse({
      component_id: 'leaderboard_evaluation',
      started_at: '2026-01-01T00:00:00Z',
      metadata: { display_name: 'Leaderboard' },
      stages: [
        {
          id: 'build_leaderboard',
          status: { state: 'completed' },
          metrics: { best_model: 'model-a' },
        },
      ],
    });
    const stage = mergeStatusIntoStageMap(
      mockComponentStageMap,
      new Map([['leaderboard_evaluation', status]]),
    ).components[2].stages[0];
    expect(stage.description).toBe('Aggregate model metrics');
    expect(stage.metrics).toEqual({ best_model: 'model-a' });
  });

  it('should add canonical status and metrics to merged stages', () => {
    const merged = mergeStatusIntoStageMap(
      mockComponentStageMap,
      new Map([['autogluon_models_training', mockComponentStatus]]),
    );
    expect(merged.components[1].stages[0].status).toEqual({ state: 'completed', step: undefined });
    expect(merged.components[1].stages[0].metrics).toEqual({ train_rows: 213, test_rows: 179 });
  });

  it('should preserve stage descriptions and the complete map catalog', () => {
    const merged = mergeStatusIntoStageMap(
      stageMap,
      new Map([
        [
          'training_component',
          artifact([{ id: 'load_data', status: { state: 'running', step: 'unknown' } }]),
        ],
      ]),
    );
    expect(merged.components[0].stages[0].description).toBe('Load data');
    expect(merged.components[0].stages[0].steps).toEqual(['load', 'train']);
    expect(merged.components[0].stages).toHaveLength(3);
    expect(merged.components[0].stages[0].status).toEqual({ state: 'running', step: undefined });
  });

  it('should retain component metadata and failed error details', () => {
    const merged = mergeStatusIntoStageMap(
      stageMap,
      new Map([
        [
          'training_component',
          artifact([{ id: 'model_selection', status: { state: 'failed' }, error: 'Failed' }]),
        ],
      ]),
    );
    expect(merged.components[0].metadata).toEqual({ display_name: 'Model training' });
    expect(merged.components[0].stages[1].error).toBe('Failed');
  });

  it('should preserve completed and failed stages against unsupported canonical states', () => {
    const completed = mergeStageWithStatus(
      { id: 'load_data', description: 'Load data', status: 'completed' },
      { id: 'load_data', status: { state: 'running' } },
    );
    const failed = mergeStageWithStatus(
      { id: 'load_data', description: 'Load data', status: 'failed' },
      { id: 'load_data', status: { state: 'started' } },
    );
    expect(completed.status).toEqual({ state: 'running', step: undefined });
    expect(failed.status).toEqual({ state: 'started', step: undefined });
  });

  it('should clear canonical selected models when metrics provides an empty array', () => {
    const merged = mergeStageWithStatus(
      { id: 'model_selection', description: 'Run models', selected_models: ['ExistingModel'] },
      { id: 'model_selection', status: { state: 'completed' }, metrics: { selected_models: [] } },
    );
    expect(merged.selected_models).toEqual([]);
  });

  it('should preserve selected models when metrics has no valid strings', () => {
    expect(() =>
      ComponentStatusFileSchema.parse({
        ...mockComponentStatus,
        stages: [
          {
            id: 'model_selection',
            status: { state: 'completed' },
            metrics: { selected_models: [42, null] },
          },
        ],
      }),
    ).toThrow();
  });

  it('should reject legacy flat status fields instead of flattening them', () => {
    expect(() =>
      ComponentStatusFileSchema.parse({
        component_id: 'training_component',
        started_at: '2026-01-01T00:00:00Z',
        metadata: { display_name: 'Training' },
        stages: [{ id: 'load_data', status: 'completed', metadata: { train_rows: 1 } }],
      }),
    ).toThrow();
  });

  it('should reject legacy nested stage metadata', () => {
    expect(() =>
      ComponentStatusFileSchema.parse({
        component_id: 'training_component',
        started_at: '2026-01-01T00:00:00Z',
        metadata: { display_name: 'Training' },
        stages: [{ id: 'load_data', status: 'completed', metadata: { train_rows: 500 } }],
      }),
    ).toThrow();
  });

  it('should reject unsafe legacy flattening payloads', () => {
    expect(() =>
      ComponentStatusFileSchema.parse({
        component_id: 'training_component',
        started_at: '2026-01-01T00:00:00Z',
        metadata: { display_name: 'Training' },
        stages: [{ id: 'model_selection', status: 'completed', __proto__: { polluted: true } }],
      }),
    ).toThrow();
  });
});

describe('isComponentFullyComplete', () => {
  it('should return true when every canonical stage is completed', () => {
    expect(isComponentFullyComplete(mockComponentStatus)).toBe(true);
  });

  it('should return false when a stage has no status', () => {
    const partial = ComponentStatusFileSchema.parse({
      component_id: 'test',
      started_at: '2026-01-01T00:00:00Z',
      metadata: { display_name: 'Test' },
      stages: [
        { id: 'a', status: { state: 'completed' } },
        { id: 'b', status: { state: 'started' } },
      ],
    });
    expect(isComponentFullyComplete(partial)).toBe(false);
  });

  it('should return false for an empty canonical stages array', () => {
    const empty = ComponentStatusFileSchema.parse({
      component_id: 'test',
      started_at: '2026-01-01T00:00:00Z',
      metadata: { display_name: 'Test' },
      stages: [],
    });
    expect(isComponentFullyComplete(empty)).toBe(false);
  });
});

import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import {
  getStageMapDetails,
  getStageDescriptionFromMap,
  parseStageMapNodeId,
} from '~/app/topology/tree-view/stageMapStepMetadata';

/* eslint-disable camelcase */

const mockComponentStageMap: ComponentStageMap = {
  pipeline_id: 'autogluon-tabular-training-pipeline',
  description: 'Tabular AutoGluon pipeline',
  kfp_run_id: 'run-123',
  published_at: '2026-06-04T17:47:14.948493Z',
  components: [
    {
      id: 'autogluon_models_training',
      description: 'Train AutoGluon tabular models',
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
    },
  ],
};

describe('parseStageMapNodeId', () => {
  it('parses stage nodes', () => {
    expect(parseStageMapNodeId('autogluon_models_training__load_data')).toEqual({
      type: 'stage',
      componentId: 'autogluon_models_training',
      stageId: 'load_data',
    });
  });

  it('parses branch step nodes', () => {
    expect(
      parseStageMapNodeId('autogluon_models_training__step__feature_engineering__branch-1'),
    ).toEqual({
      type: 'branch_step',
      componentId: 'autogluon_models_training',
      stepId: 'feature_engineering',
      branchIndex: 1,
    });
  });

  it('parses branch model nodes', () => {
    expect(parseStageMapNodeId('autogluon_models_training__model__branch-0')).toEqual({
      type: 'branch_model',
      componentId: 'autogluon_models_training',
      branchIndex: 0,
    });
  });

  it('parses the maximum valid branch index', () => {
    expect(
      parseStageMapNodeId('autogluon_models_training__step__feature_engineering__branch-9'),
    ).toEqual({
      type: 'branch_step',
      componentId: 'autogluon_models_training',
      stepId: 'feature_engineering',
      branchIndex: 9,
    });
    expect(parseStageMapNodeId('autogluon_models_training__model__branch-9')).toEqual({
      type: 'branch_model',
      componentId: 'autogluon_models_training',
      branchIndex: 9,
    });
  });

  it('returns undefined for fallback topology node IDs', () => {
    expect(parseStageMapNodeId('pre-0')).toBeUndefined();
    expect(parseStageMapNodeId('p1-step-2')).toBeUndefined();
  });

  it('returns undefined for malformed branch identifiers', () => {
    expect(
      parseStageMapNodeId('autogluon_models_training__step__feature_engineering__branch-'),
    ).toBeUndefined();
    expect(
      parseStageMapNodeId('autogluon_models_training__step__feature_engineering__branch--1'),
    ).toBeUndefined();
    expect(
      parseStageMapNodeId('autogluon_models_training__step__feature_engineering__branch-x'),
    ).toBeUndefined();
    expect(
      parseStageMapNodeId('autogluon_models_training__step__feature_engineering__branch-abc'),
    ).toBeUndefined();
    expect(
      parseStageMapNodeId('autogluon_models_training__step__foo__branch-0__extra'),
    ).toBeUndefined();
    expect(parseStageMapNodeId('autogluon_models_training__model__branch-')).toBeUndefined();
    expect(parseStageMapNodeId('autogluon_models_training__model__branch--1')).toBeUndefined();
    expect(parseStageMapNodeId('autogluon_models_training__model__branch-x')).toBeUndefined();
  });

  it('returns undefined for out-of-bounds branch indices', () => {
    expect(
      parseStageMapNodeId(
        'autogluon_models_training__step__feature_engineering__branch-999999999999999999999',
      ),
    ).toBeUndefined();
    expect(
      parseStageMapNodeId('autogluon_models_training__step__feature_engineering__branch-999999'),
    ).toBeUndefined();
    expect(parseStageMapNodeId('autogluon_models_training__model__branch-10')).toBeUndefined();
  });

  it('returns undefined when component ID is empty', () => {
    expect(parseStageMapNodeId('__load_data')).toBeUndefined();
    expect(parseStageMapNodeId('__step__feature_engineering__branch-1')).toBeUndefined();
    expect(parseStageMapNodeId('__model__branch-0')).toBeUndefined();
  });
});

describe('getStageMapDetails', () => {
  it('builds stage details from merged status fields', () => {
    const parsed = parseStageMapNodeId('autogluon_models_training__load_data');
    expect(parsed).toBeDefined();

    const details = getStageMapDetails(parsed!, mockComponentStageMap);
    expect(details).toEqual(
      expect.arrayContaining([
        { label: 'Duration', value: '34 s' },
        { label: 'Training rows', value: '213' },
        { label: 'Test rows', value: '179' },
      ]),
    );
    expect(details?.some((detail) => detail.label === 'Status')).toBe(false);
    expect(details?.some((detail) => detail.label === 'Display name')).toBe(false);
  });

  it('omits internal stage fields from details', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          ...mockComponentStageMap.components[0],
          stages: [
            {
              id: 'prepare_data',
              description: 'Prepare data',
              status: 'completed',
              timestamp: '2026-06-04T17:49:19.232065Z',
              display_name: 'Prepare data',
              row_count: 1000,
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('autogluon_models_training__prepare_data');
    const details = getStageMapDetails(parsed!, stageMap);

    expect(details).toEqual(expect.arrayContaining([{ label: 'Row count', value: '1000' }]));
    expect(details?.some((detail) => detail.label === 'Status')).toBe(false);
    expect(details?.some((detail) => detail.label === 'Display name')).toBe(false);
  });

  it('flattens nested stage metadata fields', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          ...mockComponentStageMap.components[0],
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
        },
      ],
    };
    const parsed = parseStageMapNodeId('autogluon_models_training__load_data');
    const details = getStageMapDetails(parsed!, stageMap);

    expect(details).toEqual(
      expect.arrayContaining([
        { label: 'Training rows', value: '500' },
        { label: 'Test rows', value: '125' },
      ]),
    );
  });

  it('formats evaluation metric labels for stage nodes', () => {
    const parsed = parseStageMapNodeId('autogluon_models_training__evaluate_models');
    const details = getStageMapDetails(parsed!, mockComponentStageMap);

    expect(details).toEqual(
      expect.arrayContaining([
        { label: 'Duration', value: '< 1 s' },
        { label: 'Evaluation metric', value: 'Accuracy' },
      ]),
    );
  });

  it('includes selected model and model selection duration for branch steps', () => {
    const parsed = parseStageMapNodeId('autogluon_models_training__step__model_training__branch-1');
    const details = getStageMapDetails(parsed!, mockComponentStageMap);

    expect(details).toEqual(
      expect.arrayContaining([
        { label: 'Duration', value: '8 s' },
        { label: 'Selected model', value: 'LightGBM_BAG_L2' },
        { label: 'Top models', value: '3' },
      ]),
    );
  });

  it('includes model name for branch model nodes', () => {
    const parsed = parseStageMapNodeId('autogluon_models_training__model__branch-0');
    const details = getStageMapDetails(
      parsed!,
      mockComponentStageMap,
      undefined,
      'ExtraTreesGini_BAG_L2',
    );

    expect(details).toEqual(
      expect.arrayContaining([
        { label: 'Model', value: 'ExtraTreesGini_BAG_L2' },
        { label: 'Duration', value: '8 s' },
        { label: 'Top models', value: '3' },
      ]),
    );
  });

  it('includes topology model label when selected_models is absent', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          ...mockComponentStageMap.components[0],
          stages: mockComponentStageMap.components[0].stages.map((stage) =>
            stage.id === 'model_selection' ? { ...stage, selected_models: undefined } : stage,
          ),
        },
      ],
    };
    const parsed = parseStageMapNodeId('autogluon_models_training__model__branch-0');
    const details = getStageMapDetails(parsed!, stageMap, undefined, 'Model 1', 'completed');

    expect(details).toEqual(
      expect.arrayContaining([
        { label: 'Model', value: 'Model 1' },
        { label: 'Duration', value: '8 s' },
        { label: 'Top models', value: '3' },
      ]),
    );
    expect(details?.some((detail) => detail.label === 'Selected model')).toBe(false);
  });

  it('falls back when selected_models entries are blank or non-strings', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          ...mockComponentStageMap.components[0],
          stages: mockComponentStageMap.components[0].stages.map((stage) =>
            stage.id === 'model_selection'
              ? { ...stage, selected_models: ['', '   ', 42, { name: 'bad' }] }
              : stage,
          ),
        },
      ],
    };
    const parsed = parseStageMapNodeId('autogluon_models_training__model__branch-0');
    const details = getStageMapDetails(parsed!, stageMap, undefined, undefined, 'failed');

    expect(details?.find((detail) => detail.label === 'Selected model')).toEqual({
      label: 'Selected model',
      value: '—',
    });
  });

  it('falls back for stage array fields that contain non-primitive values', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          ...mockComponentStageMap.components[0],
          stages: mockComponentStageMap.components[0].stages.map((stage) =>
            stage.id === 'load_data'
              ? { ...stage, tags: ['ok', { nested: true }], status: 'completed' }
              : stage,
          ),
        },
      ],
    };
    const parsed = parseStageMapNodeId('autogluon_models_training__load_data');
    const details = getStageMapDetails(parsed!, stageMap);

    expect(details?.find((detail) => detail.label === 'Tags')).toEqual({
      label: 'Tags',
      value: '—',
    });
  });

  it('does not infer duration for stages that never executed', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          id: 'automl_data_loader',
          description: 'Load tabular data',
          stages: [
            {
              id: 'prepare_data',
              description: 'Prepare data',
              status: 'failed',
              timestamp: '2026-06-04T17:49:19.232065Z',
            },
            {
              id: 'split',
              description: 'Split and export',
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('automl_data_loader__split');
    const details = getStageMapDetails(
      parsed!,
      stageMap,
      {
        run_id: 'run-123',
        display_name: 'Test Run',
        state: 'FAILED',
        created_at: '2025-01-17T00:00:00Z',
        run_details: {
          task_details: [
            {
              run_id: 'run-123',
              task_id: 'automl-data-loader',
              display_name: 'automl-data-loader',
              create_time: '2025-01-17T00:00:00Z',
              start_time: '2026-06-04T17:49:19.232065Z',
              end_time: '2026-06-04T17:49:40.232065Z',
              state: 'FAILED',
            },
          ],
        },
      } as never,
      undefined,
      'pending',
    );

    expect(details).toEqual([
      { label: 'Duration', value: '—' },
      { label: 'Training rows', value: '—' },
      { label: 'Test rows', value: '—' },
    ]);
  });

  it('does not infer duration from component timestamps for unreached stages', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          id: 'automl_data_loader',
          description: 'Load tabular data',
          started_at: '2026-06-04T17:49:19.223056Z',
          completed_at: '2026-06-04T17:49:40.232065Z',
          stages: [
            {
              id: 'prepare_data',
              description: 'Prepare data',
              status: 'failed',
              timestamp: '2026-06-04T17:49:19.232065Z',
            },
            {
              id: 'split',
              description: 'Split and export',
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('automl_data_loader__split');
    const details = getStageMapDetails(parsed!, stageMap, undefined, undefined, 'pending');

    expect(details).toEqual([
      { label: 'Duration', value: '—' },
      { label: 'Training rows', value: '—' },
      { label: 'Test rows', value: '—' },
    ]);
  });

  it('shows duration for a failed stage using the component task end time', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          id: 'automl_data_loader',
          description: 'Load tabular data',
          stages: [
            {
              id: 'prepare_data',
              description: 'Prepare data',
              status: 'failed',
              timestamp: '2026-06-04T17:49:19.232065Z',
            },
            {
              id: 'split',
              description: 'Split and export',
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('automl_data_loader__prepare_data');
    const details = getStageMapDetails(
      parsed!,
      stageMap,
      {
        run_id: 'run-123',
        display_name: 'Test Run',
        state: 'FAILED',
        created_at: '2025-01-17T00:00:00Z',
        run_details: {
          task_details: [
            {
              run_id: 'run-123',
              task_id: 'automl-data-loader',
              display_name: 'automl-data-loader',
              create_time: '2025-01-17T00:00:00Z',
              start_time: '2026-06-04T17:49:19.232065Z',
              end_time: '2026-06-04T17:49:40.232065Z',
              state: 'FAILED',
            },
          ],
        },
      } as never,
      undefined,
      'failed',
    );

    expect(details).toEqual([
      { label: 'Duration', value: '21 s' },
      { label: 'Row count', value: '—' },
    ]);
  });

  it('prefers component started_at over task create_time when task start_time is missing', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          id: 'automl_data_loader',
          description: 'Load tabular data',
          started_at: '2026-06-04T17:49:19.232065Z',
          stages: [
            {
              id: 'prepare_data',
              description: 'Prepare data',
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('automl_data_loader__prepare_data');
    const details = getStageMapDetails(
      parsed!,
      stageMap,
      {
        run_id: 'run-123',
        display_name: 'Test Run',
        state: 'FAILED',
        created_at: '2025-01-17T00:00:00Z',
        run_details: {
          task_details: [
            {
              run_id: 'run-123',
              task_id: 'automl-data-loader',
              display_name: 'automl-data-loader',
              create_time: '2025-01-17T00:00:00Z',
              end_time: '2026-06-04T17:49:40.232065Z',
              state: 'FAILED',
            },
          ],
        },
      } as never,
      undefined,
      'failed',
    );

    expect(details).toEqual([
      { label: 'Duration', value: '21 s' },
      { label: 'Row count', value: '—' },
    ]);
  });

  it('uses component task start for started stages without timestamp', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          id: 'automl_data_loader',
          description: 'Load tabular data',
          started_at: '2026-06-04T17:49:19.000000Z',
          stages: [
            {
              id: 'prepare_data',
              description: 'Prepare data',
              status: 'completed',
              timestamp: '2026-06-04T17:49:19.232065Z',
            },
            {
              id: 'split',
              description: 'Split and export',
              status: 'started',
            },
            {
              id: 'export',
              description: 'Export outputs',
              status: 'completed',
              timestamp: '2026-06-04T17:49:40.232065Z',
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('automl_data_loader__split');
    const details = getStageMapDetails(
      parsed!,
      stageMap,
      {
        run_id: 'run-123',
        display_name: 'Test Run',
        state: 'RUNNING',
        created_at: '2025-01-17T00:00:00Z',
        run_details: {
          task_details: [
            {
              run_id: 'run-123',
              task_id: 'automl-data-loader',
              display_name: 'automl-data-loader',
              create_time: '2025-01-17T00:00:00Z',
              start_time: '2026-06-04T17:49:35.232065Z',
              state: 'RUNNING',
            },
          ],
        },
      } as never,
      undefined,
      'active',
    );

    expect(details).toEqual(expect.arrayContaining([{ label: 'Duration', value: '5 s' }]));
  });

  it('shows duration for a failed stage inferred from run details when stage status is missing', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          id: 'automl_data_loader',
          description: 'Load tabular data',
          stages: [
            {
              id: 'prepare_data',
              description: 'Prepare data',
            },
            {
              id: 'split',
              description: 'Split and export',
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('automl_data_loader__prepare_data');
    const pipelineRun = {
      run_id: 'run-123',
      display_name: 'Test Run',
      state: 'FAILED',
      created_at: '2025-01-17T00:00:00Z',
      finished_at: '2026-06-04T17:49:40.232065Z',
      run_details: {
        task_details: [
          {
            run_id: 'run-123',
            task_id: 'automl-data-loader',
            display_name: 'automl-data-loader',
            create_time: '2025-01-17T00:00:00Z',
            start_time: '2026-06-04T17:49:19.232065Z',
            end_time: '2026-06-04T17:49:40.232065Z',
            state: 'FAILED',
          },
        ],
      },
    } as never;
    const details = getStageMapDetails(parsed!, stageMap, pipelineRun, undefined, 'failed');

    expect(details).toEqual([
      { label: 'Duration', value: '21 s' },
      { label: 'Row count', value: '—' },
    ]);
  });

  it('shows placeholder fields for a failed stage with merged metric data', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          ...mockComponentStageMap.components[0],
          stages: [
            {
              id: 'load_data',
              description: 'Load train/validation CSVs',
              status: 'failed',
              timestamp: '2026-06-04T17:49:19.232065Z',
              train_rows: 213,
            },
            mockComponentStageMap.components[0].stages[1],
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('autogluon_models_training__load_data');
    const details = getStageMapDetails(parsed!, stageMap, undefined, undefined, 'failed');

    expect(details).toEqual([
      { label: 'Duration', value: '34 s' },
      { label: 'Training rows', value: '213' },
      { label: 'Test rows', value: '—' },
    ]);
  });
});

describe('getStageDescriptionFromMap', () => {
  it('returns stage description from the stage map', () => {
    const parsed = parseStageMapNodeId('autogluon_models_training__load_data');
    expect(getStageDescriptionFromMap(parsed!, mockComponentStageMap)).toBe(
      'Load train/validation CSVs',
    );
  });

  it('returns undefined when the component is missing', () => {
    const parsed = parseStageMapNodeId('missing_component__load_data');
    expect(getStageDescriptionFromMap(parsed!, mockComponentStageMap)).toBeUndefined();
  });
});

/* eslint-enable camelcase */

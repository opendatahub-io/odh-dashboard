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
      id: 'rag_component',
      description: 'RAG component',
      stages: [
        { id: 'prepare', description: 'Prepare data', steps: ['chunk', 'embed'] },
        {
          id: 'optimize_templates',
          description: 'Optimize patterns',
          steps: ['retrieve'],
          selected_patterns: ['map-pattern'],
        },
        { id: 'publish', description: 'Publish results' },
      ],
    },
  ],
};

const artifact = (stages: unknown[], metadata = { display_name: 'RAG optimization' }) =>
  ComponentStatusFileSchema.parse({
    component_id: 'rag_component',
    started_at: '2026-01-01T00:00:00Z',
    metadata,
    stages,
  });

const mockComponentStageMap: ComponentStageMap = {
  pipeline_id: 'documents-rag-optimization-pipeline',
  description: 'AutoRAG pipeline',
  kfp_run_id: 'run-123',
  published_at: '2026-06-04T17:47:14.948493Z',
  components: [
    {
      id: 'data_ingestion',
      description: 'Ingest documents',
      stages: [
        { id: 'validate_inputs', description: 'Validate pipeline inputs' },
        { id: 'list_and_sample', description: 'List and sample source documents' },
        { id: 'extract_documents', description: 'Extract document content' },
        { id: 'write_descriptor', description: 'Write document descriptor' },
      ],
    },
    {
      id: 'rag_optimization',
      description: 'Optimize RAG patterns',
      stages: [
        { id: 'prepare_search_space', description: 'Prepare the search space' },
        {
          id: 'optimize_templates',
          description: 'Evaluate candidate RAG pattern configurations',
          steps: ['chunking', 'embedding', 'retrieval', 'generation'],
        },
        { id: 'run_optimization', description: 'Run the top patterns' },
        { id: 'write_patterns', description: 'Write evaluated patterns' },
      ],
    },
    {
      id: 'leaderboard_evaluation',
      description: 'Build the pattern leaderboard',
      stages: [{ id: 'build_leaderboard', description: 'Aggregate pattern metrics' }],
    },
  ],
};

const mockComponentStatus = ComponentStatusFileSchema.parse({
  component_id: 'rag_optimization',
  started_at: '2026-06-04T17:49:19.223056Z',
  completed_at: '2026-06-04T17:50:10.290690Z',
  metadata: { display_name: 'Optimization' },
  stages: [
    {
      id: 'prepare_search_space',
      status: { state: 'completed' },
      metrics: { document_count: 213 },
    },
    {
      id: 'optimize_templates',
      status: { state: 'completed' },
      metrics: { selected_patterns: ['pattern_a', 'pattern_b'] },
    },
    { id: 'run_optimization', status: { state: 'completed' }, metrics: { pattern_count: 3 } },
    {
      id: 'write_patterns',
      status: { state: 'completed' },
      metrics: { eval_metric: 'faithfulness' },
    },
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
    ['rag_optimization', 'rag-optimization'],
    ['leaderboard', 'leaderboard'],
    ['', ''],
    ['a__b___c', 'a--b---c'],
  ])('converts component id %s', (id, expected) => expect(componentIdToTaskId(id)).toBe(expected));
  it('filters by run and task state, including terminal failures and cancellations', () => {
    expect(getComponentsToFetch(undefined, createMockPipelineRun('RUNNING'), new Set())).toEqual(
      [],
    );
    expect(getComponentsToFetch(mockComponentStageMap, undefined, new Set())).toEqual([]);
    expect(
      getComponentsToFetch(mockComponentStageMap, createMockPipelineRun('SUCCEEDED'), new Set()),
    ).toEqual(['data_ingestion', 'rag_optimization', 'leaderboard_evaluation']);
    expect(
      getComponentsToFetch(
        mockComponentStageMap,
        createMockPipelineRun('running', [
          { task_id: 'data-ingestion', state: ' Succeeded ' },
          { task_id: 'rag-optimization', state: 'running' },
          { task_id: 'leaderboard-evaluation', state: 'pending' },
        ]),
        new Set(),
      ),
    ).toEqual(['data_ingestion', 'rag_optimization']);
    expect(
      getComponentsToFetch(
        mockComponentStageMap,
        createMockPipelineRun('CANCELED', [
          { task_id: 'data-ingestion', state: 'SUCCEEDED' },
          { task_id: 'rag-optimization', state: 'CANCELED' },
        ]),
        new Set(['data_ingestion']),
      ),
    ).toEqual(['rag_optimization']);
  });
  it('matches display names and only numeric branch suffixes', () => {
    expect(
      getComponentsToFetch(
        mockComponentStageMap,
        createMockPipelineRun('RUNNING', [
          { task_id: 'internal', display_name: 'data-ingestion', state: 'SUCCEEDED' },
          { task_id: 'rag-optimization-2', state: 'RUNNING' },
        ]),
        new Set(),
      ),
    ).toEqual(['data_ingestion', 'rag_optimization']);
    expect(matchesComponentTaskName('rag-optimization-2', 'rag_optimization')).toBe(true);
    expect(matchesComponentTaskName('rag-optimization-backup', 'rag_optimization')).toBe(false);
  });
  it('skips driver tasks and discovers branch prefixes', () => {
    const details = [
      { task_id: 'rag-optimization-2-driver', state: 'SUCCEEDED' },
      { task_id: 'rag-optimization-2', state: 'FAILED' },
    ];
    expect(findComponentTaskInRunDetails(details, 'rag_optimization')).toEqual(details[1]);
    expect(isKfpDriverTaskName(details[0].task_id)).toBe(true);
    const prefixes = buildRunLevelPrefixesFromTaskDetails('root', 'run-123', [
      ...details,
      { task_id: 'data-ingestion' },
    ]);
    expect(prefixes).toEqual([
      { prefix: 'root/run-123/rag-optimization-2/' },
      { prefix: 'root/run-123/data-ingestion/' },
    ]);
    expect(
      resolveActiveRunLevelPrefix(
        'root',
        'run-123',
        mockComponentStageMap,
        createMockPipelineRun('RUNNING', [{ task_id: 'rag-optimization-2', state: 'RUNNING' }]),
      ),
    ).toBe('root/run-123/rag-optimization-2');
    expect(resolveComponentTaskS3Prefix('root', 'run-123', 'rag_optimization', prefixes)).toBe(
      'root/run-123/rag-optimization-2',
    );
    expect(resolveComponentTaskS3Prefix('root', 'run-123', 'data_ingestion')).toBe(
      'root/run-123/data-ingestion',
    );
    expect(resolveComponentTaskS3Prefix('root', 'run-123', 'rag_optimization', [])).toBeUndefined();
  });

  it('returns all component ids when the run is succeeded', () => {
    expect(
      getComponentsToFetch(mockComponentStageMap, createMockPipelineRun('SUCCEEDED'), new Set()),
    ).toEqual(['data_ingestion', 'rag_optimization', 'leaderboard_evaluation']);
  });

  it('normalizes run and task state casing and whitespace', () => {
    expect(
      getComponentsToFetch(
        mockComponentStageMap,
        createMockPipelineRun(' succeeded ', [{ task_id: 'data-ingestion', state: ' succeeded ' }]),
        new Set(),
      ),
    ).toEqual(['data_ingestion', 'rag_optimization', 'leaderboard_evaluation']);
  });

  it('skips components already completed', () => {
    expect(
      getComponentsToFetch(
        mockComponentStageMap,
        createMockPipelineRun('SUCCEEDED'),
        new Set(['rag_optimization']),
      ),
    ).toEqual(['data_ingestion', 'leaderboard_evaluation']);
  });

  it('includes failed and canceled tasks when the run is not succeeded', () => {
    expect(
      getComponentsToFetch(
        mockComponentStageMap,
        createMockPipelineRun('CANCELED', [
          { task_id: 'data-ingestion', state: 'SUCCEEDED' },
          { task_id: 'rag-optimization', state: 'CANCELED' },
        ]),
        new Set(),
      ),
    ).toEqual(['data_ingestion', 'rag_optimization']);
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

  it('returns no components when inputs are unavailable', () => {
    expect(getComponentsToFetch(undefined, createMockPipelineRun('RUNNING'), new Set())).toEqual(
      [],
    );
    expect(getComponentsToFetch(mockComponentStageMap, undefined, new Set())).toEqual([]);
  });

  it('matches tasks by display name and branch suffix', () => {
    expect(
      getComponentsToFetch(
        mockComponentStageMap,
        createMockPipelineRun('RUNNING', [
          { task_id: 'internal', display_name: 'data-ingestion', state: 'SUCCEEDED' },
          { task_id: 'rag-optimization-2', state: 'RUNNING' },
        ]),
        new Set(),
      ),
    ).toEqual(['data_ingestion', 'rag_optimization']);
  });

  it('matches exact task names and identifies drivers', () => {
    expect(matchesComponentTaskName('rag-optimization', 'rag_optimization')).toBe(true);
    expect(matchesComponentTaskName('rag-optimization-2', 'rag_optimization')).toBe(true);
    expect(matchesComponentTaskName('other-task', 'rag_optimization')).toBe(false);
    expect(isKfpDriverTaskName('data-ingestion-driver')).toBe(true);
    expect(isKfpDriverTaskName('rag-optimization-2')).toBe(false);
  });

  it('resolves the executor when the driver appears first', () => {
    const details = [
      { task_id: 'data-ingestion-driver', state: 'SUCCEEDED' },
      { task_id: 'data-ingestion', state: 'SUCCEEDED' },
    ];
    expect(findComponentTaskInRunDetails(details, 'data_ingestion')).toEqual(details[1]);
  });

  it('falls back to the base path when discovery has no matching prefix', () => {
    expect(resolveComponentTaskS3Prefix('root', 'run-123', 'data_ingestion')).toBe(
      'root/run-123/data-ingestion',
    );
    expect(resolveComponentTaskS3Prefix('root', 'run-123', 'rag_optimization', [])).toBeUndefined();
    expect(
      resolveComponentTaskS3Prefix('root', 'run-123', 'rag_optimization', [
        { prefix: 'root/run-123/rag-optimization-backup/' },
      ]),
    ).toBe('root/run-123/rag-optimization');
  });
});

describe('legacy merge and completion coverage with canonical status files', () => {
  it('merges matching components and preserves map descriptions and unmatched components', () => {
    const result = mergeStatusIntoStageMap(
      mockComponentStageMap,
      new Map([['rag_optimization', mockComponentStatus]]),
    );
    expect(result.components[1].started_at).toBe('2026-06-04T17:49:19.223056Z');
    expect(result.components[1].metadata).toEqual({ display_name: 'Optimization' });
    expect(result.components[1].stages[0].description).toBe('Prepare the search space');
    expect(result.components[1].stages[0].metrics).toEqual({ document_count: 213 });
    expect(result.components[0]).toEqual(mockComponentStageMap.components[0]);
  });
  it('keeps unrecorded stages pending and does not mutate the source map', () => {
    const original = JSON.stringify(mockComponentStageMap);
    const partial = ComponentStatusFileSchema.parse({
      component_id: 'rag_optimization',
      started_at: '2026-01-01T00:00:00Z',
      metadata: { display_name: 'Optimization' },
      stages: [{ id: 'prepare_search_space', status: { state: 'completed' } }],
    });
    expect(
      mergeStatusIntoStageMap(mockComponentStageMap, new Map([['rag_optimization', partial]]))
        .components[1].stages[2].status,
    ).toBeUndefined();
    expect(JSON.stringify(mockComponentStageMap)).toBe(original);
  });
  it('merges leaderboard metrics without replacing descriptions', () => {
    const status = ComponentStatusFileSchema.parse({
      component_id: 'leaderboard_evaluation',
      started_at: '2026-01-01T00:00:00Z',
      metadata: { display_name: 'Leaderboard' },
      stages: [
        {
          id: 'build_leaderboard',
          status: { state: 'completed' },
          metrics: { best_pattern: 'pattern_b' },
        },
      ],
    });
    const stage = mergeStatusIntoStageMap(
      mockComponentStageMap,
      new Map([['leaderboard_evaluation', status]]),
    ).components[2].stages[0];
    expect(stage.description).toBe('Aggregate pattern metrics');
    expect(stage.metrics).toEqual({ best_pattern: 'pattern_b' });
  });
  it('recognizes only complete non-empty canonical status files', () => {
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
    expect(
      isComponentFullyComplete(
        ComponentStatusFileSchema.parse({
          component_id: 'test',
          started_at: '2026-01-01T00:00:00Z',
          metadata: { display_name: 'Test' },
          stages: [],
        }),
      ),
    ).toBe(false);
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
  it('reports fetch errors and settles loading', async () => {
    filesMock.mockRejectedValue(new Error('S3 unavailable'));
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'data-ingestion', state: 'SUCCEEDED' },
      { task_id: 'rag-optimization-2', state: 'RUNNING' },
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
  it('clears stale errors after a later missing status response', async () => {
    filesMock.mockRejectedValueOnce(new Error('S3 unavailable')).mockResolvedValue({
      contents: [],
      common_prefixes: [],
      is_truncated: false,
      key_count: 0,
      max_keys: 1000,
    });
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'data-ingestion', state: 'SUCCEEDED' },
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
  it('resets status state when namespace changes for the same run', async () => {
    filesMock.mockRejectedValueOnce(new Error('S3 unavailable')).mockResolvedValue({
      contents: [],
      common_prefixes: [],
      is_truncated: false,
      key_count: 0,
      max_keys: 1000,
    });
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'data-ingestion', state: 'SUCCEEDED' },
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
        component_id: 'rag_component',
        started_at: '2026-01-01T00:00:00Z',
        metadata: { display_name: 'RAG' },
        stages: [{ id: 'prepare', status: 'completed', row_count: 10 }],
      }),
    ).toThrow();
  });

  it('should require the canonical envelope and stage fields', () => {
    expect(() => ComponentStatusFileSchema.parse({ component_id: 'rag_component' })).toThrow();
    expect(() =>
      ComponentStatusFileSchema.parse({
        component_id: 'rag_component',
        started_at: '2026-01-01T00:00:00Z',
        metadata: {},
        stages: [],
      }),
    ).toThrow();
  });

  it('should parse running metrics, message, and status step', () => {
    const parsed = artifact([
      {
        id: 'prepare',
        status: {
          state: 'running',
          step: 'chunk',
          message: { level: 'warning', text: 'Chunking documents' },
          running_at: '2026-01-01T00:01:00Z',
        },
        metrics: { completed_units: 3, total_units: 8, batches: [1, 2] },
      },
    ]);
    expect(parsed.stages[0]).toMatchObject({ status: { state: 'running', step: 'chunk' } });
    expect(parsed.stages[0].metrics).toEqual({
      completed_units: 3,
      total_units: 8,
      batches: [1, 2],
    });
  });

  it('should accept an error only on a failed stage', () => {
    const failedStage = artifact([
      { id: 'optimize_templates', status: { state: 'failed' }, error: 'OPTIMIZE_FAILED' },
    ]).stages[0];
    expect('error' in failedStage ? failedStage.error : undefined).toBe('OPTIMIZE_FAILED');
    expect(() =>
      artifact([{ id: 'optimize_templates', status: { state: 'running' }, error: 'stale error' }]),
    ).toThrow();
  });

  it('should reject a missing envelope or required metadata', () => {
    expect(() => ComponentStatusFileSchema.parse({ component_id: 'rag_component' })).toThrow();
    expect(() =>
      ComponentStatusFileSchema.parse({
        component_id: 'rag_component',
        started_at: '2026-01-01T00:00:00Z',
        metadata: {},
        stages: [],
      }),
    ).toThrow();
  });

  it('should parse canonical running status, message, and metrics', () => {
    const parsed = artifact([
      {
        id: 'prepare',
        status: {
          state: 'running',
          step: 'chunk',
          message: { level: 'warning', text: 'Chunking documents' },
          running_at: '2026-01-01T00:01:00Z',
        },
        metrics: { completed_units: 3, total_units: 8, batches: [1, 2] },
      },
    ]);
    expect(parsed.stages[0].status).toMatchObject({ state: 'running', step: 'chunk' });
    expect(parsed.stages[0].metrics).toEqual({
      completed_units: 3,
      total_units: 8,
      batches: [1, 2],
    });
  });

  it('should enforce canonical identifiers, timestamps, messages, errors, and metric values', () => {
    const valid = {
      component_id: 'rag_component',
      started_at: '2026-01-01T00:00:00Z',
      metadata: { display_name: 'RAG', extra: { retained: true } },
      stages: [
        {
          id: 'prepare',
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
      ['component_id', 'RAG'],
      ['started_at', '2026-01-01T00:00:00+00:00'],
    ] as const) {
      expect(() => ComponentStatusFileSchema.parse({ ...valid, [field]: value })).toThrow();
    }
    expect(() =>
      ComponentStatusFileSchema.parse({
        ...valid,
        completed_at: 'not-a-timestamp',
        stages: [{ ...valid.stages[0], id: 'prepare-data' }],
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
  it('should preserve descriptions, order, and the complete map step catalog', () => {
    const merged = mergeStatusIntoStageMap(
      stageMap,
      new Map([
        [
          'rag_component',
          artifact([{ id: 'prepare', status: { state: 'running', step: 'unknown' } }]),
        ],
      ]),
    );
    expect(merged.components[0].stages.map((stage) => stage.id)).toEqual([
      'prepare',
      'optimize_templates',
      'publish',
    ]);
    expect(merged.components[0].stages[0].description).toBe('Prepare data');
    expect(merged.components[0].stages[0].steps).toEqual(['chunk', 'embed']);
    expect(merged.components[0].stages[0].status).toEqual({ state: 'running', step: undefined });
  });

  it('should use the component display name and retain failed error details', () => {
    const merged = mergeStatusIntoStageMap(
      stageMap,
      new Map([
        [
          'rag_component',
          artifact([{ id: 'optimize_templates', status: { state: 'failed' }, error: 'Failed' }]),
        ],
      ]),
    );
    expect(merged.components[0].metadata).toEqual({ display_name: 'RAG optimization' });
    expect(merged.components[0].stages[1].error).toBe('Failed');
  });

  it('should leave unrecorded stages pending in a partial artifact', () => {
    const merged = mergeStatusIntoStageMap(
      stageMap,
      new Map([['rag_component', artifact([{ id: 'prepare', status: { state: 'completed' } }])]]),
    );
    expect(merged.components[0].stages[2].status).toBeUndefined();
  });

  it('should merge canonical stage data without flattening it', () => {
    const merged = mergeStageWithStatus(
      stageMap.components[0].stages[0],
      artifact([{ id: 'prepare', status: { state: 'running' }, metrics: { total_units: 2 } }])
        .stages[0],
    );
    expect(merged.metrics).toEqual({ total_units: 2 });
    expect(merged.total_units).toBeUndefined();
  });

  it('should promote canonical pattern selection metrics and preserve map selections when absent', () => {
    const selected = mergeStatusIntoStageMap(
      stageMap,
      new Map([
        [
          'rag_component',
          artifact([
            {
              id: 'optimize_templates',
              status: { state: 'completed' },
              metrics: { selected_patterns: ['pattern-a', 'pattern-b'] },
            },
          ]),
        ],
      ]),
    );
    expect(selected.components[0].stages[1].selected_patterns).toEqual(['pattern-a', 'pattern-b']);

    const preserved = mergeStatusIntoStageMap(
      stageMap,
      new Map([
        ['rag_component', artifact([{ id: 'optimize_templates', status: { state: 'completed' } }])],
      ]),
    );
    expect(preserved.components[0].stages[1].selected_patterns).toEqual(['map-pattern']);
  });

  it('should ignore malformed pattern selection metrics', () => {
    const merged = mergeStatusIntoStageMap(
      stageMap,
      new Map([
        [
          'rag_component',
          artifact([
            {
              id: 'optimize_templates',
              status: { state: 'completed' },
              metrics: { selected_patterns: ['pattern-a', 1] },
            },
          ]),
        ],
      ]),
    );
    expect(merged.components[0].stages[1].selected_patterns).toEqual(['map-pattern']);
  });

  it('should return the map unchanged when no status files match', () => {
    expect(mergeStatusIntoStageMap(mockComponentStageMap, new Map())).toEqual(
      mockComponentStageMap,
    );
  });

  it('should leave unmatched stages untouched', () => {
    const result = mergeStatusIntoStageMap(
      mockComponentStageMap,
      new Map([['rag_component', artifact([{ id: 'prepare', status: { state: 'completed' } }])]]),
    );
    expect(
      result.components[0].stages.find((stage) => stage.id === 'publish')?.status,
    ).toBeUndefined();
  });

  it('should not mutate the original stage map', () => {
    const original = JSON.stringify(mockComponentStageMap);
    mergeStatusIntoStageMap(
      mockComponentStageMap,
      new Map([['rag_optimization', mockComponentStatus]]),
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
          metrics: { best_pattern: 'pattern-b' },
        },
      ],
    });
    const stage = mergeStatusIntoStageMap(
      mockComponentStageMap,
      new Map([['leaderboard_evaluation', status]]),
    ).components[2].stages[0];
    expect(stage.description).toBe('Aggregate pattern metrics');
    expect(stage.metrics).toEqual({ best_pattern: 'pattern-b' });
  });

  it('should add canonical status and metrics to merged stages', () => {
    const merged = mergeStatusIntoStageMap(
      mockComponentStageMap,
      new Map([['rag_optimization', mockComponentStatus]]),
    );
    expect(merged.components[1].stages[0].status).toEqual({ state: 'completed', step: undefined });
    expect(merged.components[1].stages[0].metrics).toEqual({ document_count: 213 });
  });

  it('should preserve descriptions, order, and the complete map catalog', () => {
    const merged = mergeStatusIntoStageMap(
      stageMap,
      new Map([
        [
          'rag_component',
          artifact([{ id: 'prepare', status: { state: 'running', step: 'unknown' } }]),
        ],
      ]),
    );
    expect(merged.components[0].stages.map((stage) => stage.id)).toEqual([
      'prepare',
      'optimize_templates',
      'publish',
    ]);
    expect(merged.components[0].stages[0].description).toBe('Prepare data');
    expect(merged.components[0].stages[0].steps).toEqual(['chunk', 'embed']);
    expect(merged.components[0].stages[0].status).toEqual({ state: 'running', step: undefined });
  });

  it('should retain component metadata and failed error details', () => {
    const merged = mergeStatusIntoStageMap(
      stageMap,
      new Map([
        [
          'rag_component',
          artifact([{ id: 'optimize_templates', status: { state: 'failed' }, error: 'Failed' }]),
        ],
      ]),
    );
    expect(merged.components[0].metadata).toEqual({ display_name: 'RAG optimization' });
    expect(merged.components[0].stages[1].error).toBe('Failed');
  });

  it('should preserve selected patterns when metrics has no valid strings', () => {
    expect(() =>
      ComponentStatusFileSchema.parse({
        ...mockComponentStatus,
        stages: [
          {
            id: 'optimize_templates',
            status: { state: 'completed' },
            metrics: { selected_patterns: [42, null] },
          },
        ],
      }),
    ).toThrow();
  });

  it('should clear canonical selected patterns when metrics provides an empty array', () => {
    const merged = mergeStageWithStatus(
      {
        id: 'optimize_templates',
        description: 'Optimize templates',
        selected_patterns: ['ExistingPattern'],
      },
      {
        id: 'optimize_templates',
        status: { state: 'completed' },
        metrics: { selected_patterns: [] },
      },
    );
    expect(merged.selected_patterns).toEqual([]);
  });

  it('should reject legacy flat status fields instead of flattening them', () => {
    expect(() =>
      ComponentStatusFileSchema.parse({
        component_id: 'rag_component',
        started_at: '2026-01-01T00:00:00Z',
        metadata: { display_name: 'RAG' },
        stages: [{ id: 'prepare', status: 'completed', metadata: { document_count: 1 } }],
      }),
    ).toThrow();
  });

  it('should reject legacy nested stage metadata', () => {
    expect(() =>
      ComponentStatusFileSchema.parse({
        component_id: 'rag_component',
        started_at: '2026-01-01T00:00:00Z',
        metadata: { display_name: 'RAG' },
        stages: [{ id: 'prepare', status: 'completed', metadata: { document_count: 500 } }],
      }),
    ).toThrow();
  });

  it('should reject legacy metadata selection recovery', () => {
    expect(() =>
      ComponentStatusFileSchema.parse({
        component_id: 'rag_component',
        started_at: '2026-01-01T00:00:00Z',
        metadata: { display_name: 'RAG' },
        stages: [
          {
            id: 'optimize_templates',
            status: 'completed',
            metadata: { selected_patterns: ['PatternA'] },
          },
        ],
      }),
    ).toThrow();
  });

  it('should reject unsafe legacy flattening payloads', () => {
    expect(() =>
      ComponentStatusFileSchema.parse({
        component_id: 'rag_component',
        started_at: '2026-01-01T00:00:00Z',
        metadata: { display_name: 'RAG' },
        stages: [{ id: 'optimize_templates', status: 'completed', __proto__: { polluted: true } }],
      }),
    ).toThrow();
  });

  it('should reject unsupported flat status values', () => {
    expect(() =>
      ComponentStatusFileSchema.parse({
        component_id: 'rag_component',
        started_at: '2026-01-01T00:00:00Z',
        metadata: { display_name: 'RAG' },
        stages: [{ id: 'prepare', status: 'pending' }],
      }),
    ).toThrow();
  });

  it('should reject unsupported nested status values', () => {
    expect(() =>
      ComponentStatusFileSchema.parse({
        component_id: 'rag_component',
        started_at: '2026-01-01T00:00:00Z',
        metadata: { display_name: 'RAG' },
        stages: [{ id: 'prepare', status: { state: 'pending' } }],
      }),
    ).toThrow();
  });

  it('should retain canonical metrics under their envelope', () => {
    const stage = artifact([
      { id: 'prepare', status: { state: 'completed' }, metrics: { document_count: 42 } },
    ]).stages[0];
    expect(stage.metrics).toEqual({ document_count: 42 });
    expect('document_count' in stage).toBe(false);
  });

  it('should reject canonical stages with unknown top-level fields', () => {
    expect(() =>
      ComponentStatusFileSchema.parse({
        component_id: 'rag_component',
        started_at: '2026-01-01T00:00:00Z',
        metadata: { display_name: 'RAG' },
        stages: [{ id: 'prepare', status: { state: 'completed' }, timestamp: 'legacy' }],
      }),
    ).toThrow();
  });

  it('should preserve the selected pattern map value when metrics are absent', () => {
    const merged = mergeStageWithStatus(
      {
        id: 'optimize_templates',
        description: 'Optimize templates',
        selected_patterns: ['map-pattern'],
      },
      { id: 'optimize_templates', status: { state: 'completed' } },
    );
    expect(merged.selected_patterns).toEqual(['map-pattern']);
  });

  it('should preserve failed errors only for failed canonical stages', () => {
    const merged = mergeStageWithStatus({ id: 'prepare', description: 'Prepare data' }, {
      id: 'prepare',
      status: { state: 'completed' },
      error: 'stale',
    } as never);
    expect(merged.error).toBeUndefined();
  });

  it('should return false when canonical stages are incomplete', () => {
    const partial = ComponentStatusFileSchema.parse({
      component_id: 'test',
      started_at: '2026-01-01T00:00:00Z',
      metadata: { display_name: 'Test' },
      stages: [
        { id: 'a', status: { state: 'completed' } },
        { id: 'b', status: { state: 'running' } },
      ],
    });
    expect(isComponentFullyComplete(partial)).toBe(false);
  });

  it('should return false when canonical stages are empty', () => {
    const empty = ComponentStatusFileSchema.parse({
      component_id: 'test',
      started_at: '2026-01-01T00:00:00Z',
      metadata: { display_name: 'Test' },
      stages: [],
    });
    expect(isComponentFullyComplete(empty)).toBe(false);
  });

  it('should return true when canonical stages are all completed', () => {
    expect(isComponentFullyComplete(mockComponentStatus)).toBe(true);
  });
});

describe('isComponentFullyComplete', () => {
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
});

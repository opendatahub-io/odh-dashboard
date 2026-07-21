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
import { MAX_PATTERN_SELECTION_STEPS } from '~/app/topology/stageMapConstants';

jest.mock('~/app/hooks/queries', () => ({
  useS3ListFilesQuery: jest.fn(),
}));

jest.mock('~/app/api/s3', () => ({
  getFiles: jest.fn(),
}));

/* eslint-disable camelcase */

// -- Fixtures based on real pipeline data --

const mockComponentStageMap: ComponentStageMap = {
  pipeline_id: 'documents-rag-optimization-pipeline',
  description: 'AutoRAG pipeline',
  kfp_run_id: '029660b9-c210-4ad4-9434-de28c2c9baec',
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

const mockComponentStatus: ComponentStatusFile = {
  component_id: 'rag_optimization',
  started_at: '2026-06-04T17:49:19.223056Z',
  completed_at: '2026-06-04T17:50:10.290690Z',
  stages: [
    {
      id: 'prepare_search_space',
      description: 'Prepare the search space',
      status: 'completed',
      timestamp: '2026-06-04T17:49:19.232065Z',
      document_count: 213,
    },
    {
      id: 'optimize_templates',
      description: 'Evaluate candidate RAG pattern configurations',
      status: 'completed',
      timestamp: '2026-06-04T17:49:53.951525Z',
      pattern_count: 3,
      selected_patterns: ['pattern_a', 'pattern_b', 'pattern_c'],
      steps: ['chunking', 'embedding', 'retrieval', 'generation'],
    },
    {
      id: 'run_optimization',
      description: 'Run the top patterns',
      status: 'completed',
      timestamp: '2026-06-04T17:50:02.238567Z',
      pattern_count: 3,
    },
    {
      id: 'write_patterns',
      description: 'Write evaluated patterns',
      status: 'completed',
      timestamp: '2026-06-04T17:50:10.290550Z',
      eval_metric: 'faithfulness',
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
    expect(componentIdToTaskId('rag_optimization')).toBe('rag-optimization');
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

    expect(result).toEqual(['data_ingestion', 'rag_optimization', 'leaderboard_evaluation']);
  });

  it('should normalize run and task state casing and whitespace', () => {
    const pipelineRun = createMockPipelineRun(' succeeded ', [
      { task_id: 'data-ingestion', state: ' succeeded ' },
    ]);
    expect(getComponentsToFetch(mockComponentStageMap, pipelineRun, new Set())).toEqual([
      'data_ingestion',
      'rag_optimization',
      'leaderboard_evaluation',
    ]);

    const runningRun = createMockPipelineRun('running', [
      { task_id: 'data-ingestion', state: ' Succeeded ' },
      { task_id: 'rag-optimization', state: 'running' },
      { task_id: 'leaderboard-evaluation', state: 'pending' },
    ]);
    expect(getComponentsToFetch(mockComponentStageMap, runningRun, new Set())).toEqual([
      'data_ingestion',
      'rag_optimization',
    ]);
  });

  it('should skip components already in completedComponentIds', () => {
    const pipelineRun = createMockPipelineRun('SUCCEEDED', []);
    const completed = new Set(['rag_optimization']);
    const result = getComponentsToFetch(mockComponentStageMap, pipelineRun, completed);

    expect(result).toEqual(['data_ingestion', 'leaderboard_evaluation']);
  });

  it('should return RUNNING, SUCCEEDED, or FAILED tasks when run is not SUCCEEDED', () => {
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'data-ingestion', state: 'SUCCEEDED' },
      { task_id: 'rag-optimization', state: 'RUNNING' },
      { task_id: 'leaderboard-evaluation', state: 'PENDING' },
    ]);
    const result = getComponentsToFetch(mockComponentStageMap, pipelineRun, new Set());

    expect(result).toEqual(['data_ingestion', 'rag_optimization']);
  });

  it('should include FAILED tasks when the run has not succeeded', () => {
    const pipelineRun = createMockPipelineRun('FAILED', [
      { task_id: 'data-ingestion', state: 'SUCCEEDED' },
      { task_id: 'rag-optimization-2', state: 'FAILED' },
      { task_id: 'leaderboard-evaluation', state: 'PENDING' },
    ]);
    const result = getComponentsToFetch(mockComponentStageMap, pipelineRun, new Set());

    expect(result).toEqual(['data_ingestion', 'rag_optimization']);
  });

  it('should include CANCELED tasks when the run is terminal but not SUCCEEDED', () => {
    const pipelineRun = createMockPipelineRun('CANCELED', [
      { task_id: 'data-ingestion', state: 'SUCCEEDED' },
      { task_id: 'rag-optimization', state: 'CANCELED' },
      { task_id: 'leaderboard-evaluation', state: 'PENDING' },
    ]);
    const result = getComponentsToFetch(mockComponentStageMap, pipelineRun, new Set());

    expect(result).toEqual(['data_ingestion', 'rag_optimization']);
  });

  it('should match tasks by display_name as well', () => {
    const pipelineRun = createMockPipelineRun('RUNNING', [
      {
        task_id: 'some-internal-id',
        display_name: 'data-ingestion',
        state: 'SUCCEEDED',
      },
    ]);
    const result = getComponentsToFetch(mockComponentStageMap, pipelineRun, new Set());

    expect(result).toEqual(['data_ingestion']);
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
      { task_id: 'rag-optimization-2', state: 'RUNNING' },
      { task_id: 'leaderboard-evaluation-2', state: 'PENDING' },
    ]);
    const result = getComponentsToFetch(mockComponentStageMap, pipelineRun, new Set());

    expect(result).toEqual(['rag_optimization']);
  });
});

describe('matchesComponentTaskName', () => {
  it('should match exact and branch-suffixed task names', () => {
    expect(matchesComponentTaskName('rag-optimization', 'rag_optimization')).toBe(true);
    expect(matchesComponentTaskName('rag-optimization-2', 'rag_optimization')).toBe(true);
    expect(matchesComponentTaskName('other-task', 'rag_optimization')).toBe(false);
  });

  it('should reject non-branch suffixes', () => {
    expect(matchesComponentTaskName('rag-optimization-backup', 'rag_optimization')).toBe(false);
  });
});

describe('isKfpDriverTaskName', () => {
  it('should identify KFP driver tasks', () => {
    expect(isKfpDriverTaskName('rag-optimization-2-driver')).toBe(true);
    expect(isKfpDriverTaskName('data-ingestion-driver')).toBe(true);
    expect(isKfpDriverTaskName('rag-optimization-2')).toBe(false);
  });
});

describe('findComponentTaskInRunDetails', () => {
  it('should skip driver tasks and return the executor task status', () => {
    const taskDetails = [
      { task_id: 'rag-optimization-2-driver', state: 'SUCCEEDED' },
      { task_id: 'rag-optimization-2', state: 'FAILED' },
    ];

    expect(findComponentTaskInRunDetails(taskDetails, 'rag_optimization')).toEqual({
      task_id: 'rag-optimization-2',
      state: 'FAILED',
    });
  });

  it('should resolve data ingestion status from the executor task when driver succeeded first', () => {
    const taskDetails = [
      { task_id: 'data-ingestion-driver', state: 'SUCCEEDED' },
      { task_id: 'data-ingestion', state: 'SUCCEEDED' },
    ];

    expect(findComponentTaskInRunDetails(taskDetails, 'data_ingestion')).toEqual({
      task_id: 'data-ingestion',
      state: 'SUCCEEDED',
    });
  });
});

describe('buildRunLevelPrefixesFromTaskDetails', () => {
  it('should build branch-suffixed prefixes from executor task names and skip drivers', () => {
    const prefixes = buildRunLevelPrefixesFromTaskDetails(
      'documents-rag-optimization-pipeline',
      'run-123',
      [
        { task_id: 'rag-optimization-2-driver', state: 'SUCCEEDED' },
        { task_id: 'rag-optimization-2', state: 'RUNNING' },
        { task_id: 'data-ingestion', state: 'SUCCEEDED' },
      ],
    );

    expect(prefixes).toEqual([
      { prefix: 'documents-rag-optimization-pipeline/run-123/rag-optimization-2/' },
      { prefix: 'documents-rag-optimization-pipeline/run-123/data-ingestion/' },
    ]);
  });
});

describe('resolveActiveRunLevelPrefix', () => {
  it('should resolve the executor task directory for an active branch-suffixed component', () => {
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'rag-optimization-2', state: 'RUNNING' },
    ]);

    expect(
      resolveActiveRunLevelPrefix(
        'documents-rag-optimization-pipeline',
        'run-123',
        mockComponentStageMap,
        pipelineRun,
      ),
    ).toBe('documents-rag-optimization-pipeline/run-123/rag-optimization-2');
  });

  it('should resolve suffixed task directories through run-level prefix discovery', () => {
    const prefixes = buildRunLevelPrefixesFromTaskDetails(
      'documents-rag-optimization-pipeline',
      'run-123',
      [{ task_id: 'rag-optimization-2', state: 'RUNNING' }],
    );

    expect(
      resolveComponentTaskS3Prefix(
        'documents-rag-optimization-pipeline',
        'run-123',
        'rag_optimization',
        prefixes,
      ),
    ).toBe('documents-rag-optimization-pipeline/run-123/rag-optimization-2');
  });
});

describe('resolveComponentTaskS3Prefix', () => {
  it('should resolve suffixed task directories from run-level prefixes', () => {
    const prefixes = [
      { prefix: 'documents-rag-optimization-pipeline/run-123/data-ingestion/' },
      { prefix: 'documents-rag-optimization-pipeline/run-123/rag-optimization-2/' },
    ];

    expect(
      resolveComponentTaskS3Prefix(
        'documents-rag-optimization-pipeline',
        'run-123',
        'rag_optimization',
        prefixes,
      ),
    ).toBe('documents-rag-optimization-pipeline/run-123/rag-optimization-2');
  });

  it('should fall back to the base task path when no run-level prefix matches', () => {
    expect(
      resolveComponentTaskS3Prefix(
        'documents-rag-optimization-pipeline',
        'run-123',
        'data_ingestion',
      ),
    ).toBe('documents-rag-optimization-pipeline/run-123/data-ingestion');
  });

  it('should return undefined when run-level discovery succeeded with no prefixes', () => {
    expect(
      resolveComponentTaskS3Prefix(
        'documents-rag-optimization-pipeline',
        'run-123',
        'rag_optimization',
        [],
      ),
    ).toBeUndefined();
  });

  it('should ignore non-numeric sibling prefixes and fall back to the base task path', () => {
    const prefixes = [
      { prefix: 'documents-rag-optimization-pipeline/run-123/rag-optimization-backup/' },
    ];

    expect(
      resolveComponentTaskS3Prefix(
        'documents-rag-optimization-pipeline',
        'run-123',
        'rag_optimization',
        prefixes,
      ),
    ).toBe('documents-rag-optimization-pipeline/run-123/rag-optimization');
  });
});

describe('mergeStatusIntoStageMap', () => {
  it('should return stageMap unchanged when no status files match', () => {
    const result = mergeStatusIntoStageMap(mockComponentStageMap, new Map());
    expect(result).toEqual(mockComponentStageMap);
  });

  it('should merge status data into matching component stages', () => {
    const statusFiles = new Map([['rag_optimization', mockComponentStatus]]);
    const result = mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    const mergedComponent = result.components.find((c) => c.id === 'rag_optimization')!;
    expect(mergedComponent.started_at).toBe('2026-06-04T17:49:19.223056Z');
    expect(mergedComponent.completed_at).toBe('2026-06-04T17:50:10.290690Z');
    expect(mergedComponent.metadata).toEqual({});
  });

  it('should preserve original stage descriptions after merge', () => {
    const statusFiles = new Map([['rag_optimization', mockComponentStatus]]);
    const result = mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    const mergedComponent = result.components.find((c) => c.id === 'rag_optimization')!;
    expect(mergedComponent.stages[0].description).toBe('Prepare the search space');
  });

  it('should add status fields to merged stages', () => {
    const statusFiles = new Map([['rag_optimization', mockComponentStatus]]);
    const result = mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    const mergedComponent = result.components.find((c) => c.id === 'rag_optimization')!;
    const stage = mergedComponent.stages.find((s) => s.id === 'prepare_search_space')!;

    expect(stage.status).toBe('completed');
    expect(stage.timestamp).toBe('2026-06-04T17:49:19.232065Z');
    expect(stage.document_count).toBe(213);
  });

  it('should flatten nested stage metadata onto merged stages', () => {
    const statusWithNestedMetadata: ComponentStatusFile = {
      component_id: 'rag_optimization',
      stages: [
        {
          id: 'prepare_search_space',
          description: 'Prepare the search space',
          status: 'completed',
          timestamp: '2026-06-04T17:49:19.232065Z',
          metadata: {
            document_count: 500,
            row_count: 125,
          },
        },
      ],
    };
    const statusFiles = new Map([['rag_optimization', statusWithNestedMetadata]]);
    const result = mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    const stage = result.components
      .find((component) => component.id === 'rag_optimization')!
      .stages.find((s) => s.id === 'prepare_search_space')!;

    expect(stage.document_count).toBe(500);
    expect(stage.row_count).toBe(125);
    expect(stage.metadata).toBeUndefined();
  });

  it('should merge nested stage metadata via mergeStageWithStatus', () => {
    const merged = mergeStageWithStatus(
      { id: 'prepare_search_space', description: 'Prepare the search space' },
      {
        id: 'prepare_search_space',
        description: 'ignored',
        status: 'completed',
        metadata: { document_count: 42 },
      },
    );

    expect(merged.description).toBe('Prepare the search space');
    expect(merged.status).toBe('completed');
    expect(merged.document_count).toBe(42);
    expect(merged.metadata).toBeUndefined();
  });

  it('should recover selected_patterns nested under status metadata', () => {
    const merged = mergeStageWithStatus(
      { id: 'optimize_templates', description: 'Optimize templates' },
      {
        id: 'optimize_templates',
        status: 'completed',
        metadata: { selected_patterns: ['PatternA', 'PatternB'] },
      },
    );

    expect(merged.selected_patterns).toEqual(['PatternA', 'PatternB']);
    expect(merged.metadata).toBeUndefined();
  });

  it('should not let nested metadata overwrite top-level status and timestamp', () => {
    const statusWithCollidingMetadata: ComponentStatusFile = {
      component_id: 'rag_optimization',
      stages: [
        {
          id: 'prepare_search_space',
          description: 'Prepare the search space',
          status: 'completed',
          timestamp: '2026-06-04T17:49:19.232065Z',
          metadata: {
            status: 'pending',
            timestamp: '2026-01-01T00:00:00.000000Z',
            document_count: 500,
            row_count: 125,
          },
        },
      ],
    };
    const statusFiles = new Map([['rag_optimization', statusWithCollidingMetadata]]);
    const result = mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    const stage = result.components
      .find((component) => component.id === 'rag_optimization')!
      .stages.find((s) => s.id === 'prepare_search_space')!;

    expect(stage.status).toBe('completed');
    expect(stage.timestamp).toBe('2026-06-04T17:49:19.232065Z');
    expect(stage.document_count).toBe(500);
    expect(stage.row_count).toBe(125);
    expect(stage.metadata).toBeUndefined();

    const merged = mergeStageWithStatus(
      { id: 'prepare_search_space', description: 'Prepare the search space' },
      statusWithCollidingMetadata.stages[0],
    );

    expect(merged.status).toBe('completed');
    expect(merged.timestamp).toBe('2026-06-04T17:49:19.232065Z');
    expect(merged.document_count).toBe(500);
    expect(merged.row_count).toBe(125);
    expect(merged.metadata).toBeUndefined();
  });

  it('should reject unsafe and protected keys when flattening nested stage fields', () => {
    const maliciousMetadata = {
      steps: ['evil_step'],
      selected_patterns: ['EvilPattern'],
      document_count: 500,
      constructor: { polluted: true },
      prototype: { polluted: true },
      ...JSON.parse('{"__proto__":{"polluted":true}}'),
    };

    const merged = mergeStageWithStatus(
      {
        id: 'optimize_templates',
        description: 'Evaluate candidate RAG pattern configurations',
        steps: ['chunking', 'embedding'],
      },
      {
        id: 'optimize_templates',
        description: 'ignored',
        status: 'completed',
        timestamp: '2026-06-04T17:49:53.951525Z',
        selected_patterns: ['pattern_b'],
        metadata: maliciousMetadata,
      },
    );

    expect(merged.status).toBe('completed');
    expect(merged.timestamp).toBe('2026-06-04T17:49:53.951525Z');
    expect(merged.steps).toEqual(['chunking', 'embedding']);
    expect(merged.selected_patterns).toEqual(['pattern_b']);
    expect(merged.document_count).toBe(500);
    expect(merged.metadata).toBeUndefined();

    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect(Object.hasOwn(merged, 'constructor')).toBe(false);
    expect(Object.hasOwn(merged, 'prototype')).toBe(false);
    expect(Object.hasOwn(merged, '__proto__')).toBe(false);
    expect(merged).not.toHaveProperty('polluted');
    expect(Object.prototype).toEqual(expect.not.objectContaining({ polluted: true }));
  });

  it('should leave unmatched components untouched', () => {
    const statusFiles = new Map([['rag_optimization', mockComponentStatus]]);
    const result = mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    const dataIngestion = result.components.find((c) => c.id === 'data_ingestion')!;
    expect(dataIngestion).toEqual(mockComponentStageMap.components[0]);
  });

  it('should leave unmatched stages within a merged component untouched', () => {
    const partialStatus: ComponentStatusFile = {
      component_id: 'rag_optimization',
      stages: [
        {
          id: 'prepare_search_space',
          description: 'Prepare the search space',
          status: 'completed',
          timestamp: '2026-06-04T17:49:19Z',
        },
      ],
    };
    const statusFiles = new Map([['rag_optimization', partialStatus]]);
    const result = mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    const mergedComponent = result.components.find((c) => c.id === 'rag_optimization')!;
    const runOptimizationStage = mergedComponent.stages.find((s) => s.id === 'run_optimization')!;
    expect(runOptimizationStage.status).toBeUndefined();
  });

  it('should not mutate the original stageMap', () => {
    const originalJson = JSON.stringify(mockComponentStageMap);
    const statusFiles = new Map([['rag_optimization', mockComponentStatus]]);
    mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    expect(JSON.stringify(mockComponentStageMap)).toBe(originalJson);
  });

  it('should merge leaderboard best_pattern when status stage omits description', () => {
    const leaderboardStatus: ComponentStatusFile = {
      component_id: 'leaderboard_evaluation',
      stages: [
        {
          id: 'build_leaderboard',
          status: 'completed',
          timestamp: '2026-06-04T17:50:15.000000Z',
          best_pattern: 'pattern_b',
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

    expect(buildLeaderboard.description).toBe('Aggregate pattern metrics');
    expect(buildLeaderboard.best_pattern).toBe('pattern_b');
  });

  it('should truncate oversized optimize_templates steps during status parsing', () => {
    const oversizedSteps = Array.from(
      { length: MAX_PATTERN_SELECTION_STEPS + 5 },
      (_, index) => `step_${index}`,
    );
    const parsed = ComponentStatusFileSchema.parse({
      component_id: 'rag_optimization',
      stages: [
        {
          id: 'optimize_templates',
          steps: oversizedSteps,
        },
      ],
    });

    expect(parsed.stages[0].steps).toHaveLength(MAX_PATTERN_SELECTION_STEPS);
    expect(parsed.stages[0].steps).toEqual(oversizedSteps.slice(0, MAX_PATTERN_SELECTION_STEPS));
  });

  it('should dedupe repeated optimize_templates steps before applying the cap', () => {
    const repeatedSteps = [
      ...Array.from({ length: MAX_PATTERN_SELECTION_STEPS }, () => 'chunking'),
      'embedding',
      'retrieval',
    ];
    const parsed = ComponentStatusFileSchema.parse({
      component_id: 'rag_optimization',
      stages: [
        {
          id: 'optimize_templates',
          steps: repeatedSteps,
        },
      ],
    });

    expect(parsed.stages[0].steps).toEqual(['chunking', 'embedding', 'retrieval']);

    const merged = mergeStageWithStatus(
      {
        id: 'optimize_templates',
        description: 'Evaluate candidate RAG pattern configurations',
        steps: repeatedSteps,
      },
      parsed.stages[0],
    );

    expect(merged.steps).toEqual(['chunking', 'embedding', 'retrieval']);
  });

  it('should reject malformed selected_patterns during status parsing', () => {
    const objectParsed = ComponentStatusFileSchema.parse({
      component_id: 'rag_optimization',
      stages: [
        {
          id: 'optimize_templates',
          selected_patterns: { pattern_a: 'pattern_a' },
        },
      ],
    });
    expect(objectParsed.stages[0].selected_patterns).toBeUndefined();

    const mixedParsed = ComponentStatusFileSchema.parse({
      component_id: 'rag_optimization',
      stages: [
        {
          id: 'optimize_templates',
          selected_patterns: ['pattern_b', 42, null],
        },
      ],
    });
    expect(mixedParsed.stages[0].selected_patterns).toEqual(['pattern_b']);

    const emptyParsed = ComponentStatusFileSchema.parse({
      component_id: 'rag_optimization',
      stages: [
        {
          id: 'optimize_templates',
          selected_patterns: [],
        },
      ],
    });
    expect(emptyParsed.stages[0].selected_patterns).toEqual([]);
  });

  it('should normalize documented stage statuses and drop unsupported ones during parsing', () => {
    const parsed = ComponentStatusFileSchema.parse({
      component_id: 'rag_optimization',
      stages: [
        { id: 'load_benchmark', status: ' Completed ' },
        { id: 'optimize_templates', status: 'STARTED' },
        { id: 'evaluate_patterns', status: 'running' },
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
      { id: 'load_benchmark', description: 'Load benchmark', status: 'completed' },
      {
        id: 'load_benchmark',
        status: 'running',
        timestamp: '2026-06-04T17:49:19.232065Z',
      } as unknown as ComponentStatusFile['stages'][number],
    );
    expect(completedPreserved.status).toBe('completed');
    expect(completedPreserved.timestamp).toBe('2026-06-04T17:49:19.232065Z');

    const failedPreserved = mergeStageWithStatus(
      { id: 'load_benchmark', description: 'Load benchmark', status: 'failed' },
      {
        id: 'load_benchmark',
        status: 'pending',
      } as unknown as ComponentStatusFile['stages'][number],
    );
    expect(failedPreserved.status).toBe('failed');

    const progressed = mergeStageWithStatus(
      { id: 'load_benchmark', description: 'Load benchmark', status: 'started' },
      { id: 'load_benchmark', status: 'completed' },
    );
    expect(progressed.status).toBe('completed');
  });

  it('should clear canonical selected_patterns when status provides an empty array', () => {
    const merged = mergeStageWithStatus(
      {
        id: 'optimize_templates',
        description: 'Evaluate candidate RAG pattern configurations',
        selected_patterns: ['ExistingPattern'],
      },
      {
        id: 'optimize_templates',
        status: 'completed',
        selected_patterns: [],
      },
    );

    expect(merged.selected_patterns).toEqual([]);
    expect(merged.status).toBe('completed');
  });

  it('should not clear canonical selected_patterns when a non-empty array has no valid strings', () => {
    const nonStringParsed = ComponentStatusFileSchema.parse({
      component_id: 'rag_optimization',
      stages: [
        {
          id: 'optimize_templates',
          selected_patterns: [42, null],
        },
      ],
    });
    expect(nonStringParsed.stages[0].selected_patterns).toBeUndefined();

    const merged = mergeStageWithStatus(
      {
        id: 'optimize_templates',
        description: 'Evaluate candidate RAG pattern configurations',
        selected_patterns: ['ExistingPattern'],
      },
      {
        id: 'optimize_templates',
        status: 'completed',
        selected_patterns: [42, null],
      } as unknown as ComponentStatusFile['stages'][number],
    );

    expect(merged.selected_patterns).toEqual(['ExistingPattern']);
    expect(merged.status).toBe('completed');
  });

  it('should not merge malformed selected_patterns into branch metadata', () => {
    const merged = mergeStageWithStatus(
      {
        id: 'optimize_templates',
        description: 'Evaluate candidate RAG pattern configurations',
        selected_patterns: ['ExistingPattern'],
      },
      {
        id: 'optimize_templates',
        status: 'completed',
        selected_patterns: { bad: 'value' },
      } as unknown as ComponentStatusFile['stages'][number],
    );

    expect(merged.selected_patterns).toEqual(['ExistingPattern']);
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
      { task_id: 'data-ingestion', state: 'SUCCEEDED' },
      { task_id: 'rag-optimization-2', state: 'RUNNING' },
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
        { componentId: 'data_ingestion', message: 'S3 unavailable' },
        { componentId: 'rag_optimization', message: 'S3 unavailable' },
      ]);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.mergedStageMap).toEqual(mockComponentStageMap);
  });

  it('should clear stale errors when a later fetch returns missing status', async () => {
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'data-ingestion', state: 'SUCCEEDED' },
      { task_id: 'rag-optimization-2', state: 'RUNNING' },
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
        { componentId: 'data_ingestion', message: 'S3 unavailable' },
        { componentId: 'rag_optimization', message: 'S3 unavailable' },
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
      { task_id: 'data-ingestion', state: 'SUCCEEDED' },
      { task_id: 'rag-optimization-2', state: 'RUNNING' },
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
      { task_id: 'data-ingestion', state: 'SUCCEEDED' },
      { task_id: 'rag-optimization-2', state: 'RUNNING' },
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
        { componentId: 'data_ingestion', message: 'S3 unavailable' },
        { componentId: 'rag_optimization', message: 'S3 unavailable' },
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

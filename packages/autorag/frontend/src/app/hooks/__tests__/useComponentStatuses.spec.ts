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
        { id: 'read_documents', description: 'Read source documents' },
      ],
    },
    {
      id: 'rag_optimization',
      description: 'Optimize RAG patterns',
      stages: [
        { id: 'generate_patterns', description: 'Generate candidate patterns' },
        { id: 'evaluate_patterns', description: 'Evaluate patterns' },
      ],
    },
  ],
};

const mockComponentStatus: ComponentStatusFile = {
  component_id: 'rag_optimization',
  started_at: '2026-06-04T17:49:19.223056Z',
  completed_at: '2026-06-04T17:50:10.290690Z',
  stages: [
    {
      id: 'generate_patterns',
      description: 'Generate candidate patterns',
      status: 'completed',
      timestamp: '2026-06-04T17:49:19.232065Z',
    },
    {
      id: 'evaluate_patterns',
      description: 'Evaluate patterns',
      status: 'completed',
      timestamp: '2026-06-04T17:49:53.951525Z',
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

    expect(result).toEqual(['data_ingestion', 'rag_optimization']);
  });

  it('should skip components already in completedComponentIds', () => {
    const pipelineRun = createMockPipelineRun('SUCCEEDED', []);
    const completed = new Set(['rag_optimization']);
    const result = getComponentsToFetch(mockComponentStageMap, pipelineRun, completed);

    expect(result).toEqual(['data_ingestion']);
  });

  it('should return only RUNNING or SUCCEEDED tasks when run is not SUCCEEDED', () => {
    const pipelineRun = createMockPipelineRun('RUNNING', [
      { task_id: 'data-ingestion', state: 'SUCCEEDED' },
      { task_id: 'rag-optimization', state: 'PENDING' },
    ]);
    const result = getComponentsToFetch(mockComponentStageMap, pipelineRun, new Set());

    expect(result).toEqual(['data_ingestion']);
  });

  it('should match tasks by display_name as well', () => {
    const pipelineRun = createMockPipelineRun('RUNNING', [
      {
        task_id: 'some-internal-id',
        display_name: 'data-ingestion',
        state: 'RUNNING',
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
    expect(mergedComponent.stages[0].description).toBe('Generate candidate patterns');
  });

  it('should add status fields to merged stages', () => {
    const statusFiles = new Map([['rag_optimization', mockComponentStatus]]);
    const result = mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    const mergedComponent = result.components.find((c) => c.id === 'rag_optimization')!;
    const stage = mergedComponent.stages.find((s) => s.id === 'generate_patterns')!;

    expect(stage.status).toBe('completed');
    expect(stage.timestamp).toBe('2026-06-04T17:49:19.232065Z');
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
          id: 'generate_patterns',
          description: 'Generate candidate patterns',
          status: 'completed',
          timestamp: '2026-06-04T17:49:19Z',
        },
      ],
    };
    const statusFiles = new Map([['rag_optimization', partialStatus]]);
    const result = mergeStatusIntoStageMap(mockComponentStageMap, statusFiles);

    const mergedComponent = result.components.find((c) => c.id === 'rag_optimization')!;
    const evaluateStage = mergedComponent.stages.find((s) => s.id === 'evaluate_patterns')!;
    expect(evaluateStage.status).toBeUndefined();
  });

  it('should not mutate the original stageMap', () => {
    const originalJson = JSON.stringify(mockComponentStageMap);
    const statusFiles = new Map([['rag_optimization', mockComponentStatus]]);
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

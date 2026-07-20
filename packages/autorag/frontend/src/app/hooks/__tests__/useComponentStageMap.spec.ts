import type { PipelineRun } from '~/app/types';
import { ComponentStageMapSchema, isTaskSucceeded } from '~/app/hooks/useComponentStageMap';

/* eslint-disable camelcase */
const TASK_ID = 'publish-component-stage-map';

const createMockPipelineRun = (
  taskDetails: { display_name?: string; task_id: string; state?: string }[] = [],
): PipelineRun =>
  ({
    run_id: 'run-123',
    display_name: 'Test Run',
    state: 'SUCCEEDED',
    created_at: '2025-01-17T00:00:00Z',
    run_details: {
      task_details: taskDetails.map((td) => ({
        run_id: 'run-123',
        task_id: td.task_id,
        display_name: td.display_name,
        create_time: '2025-01-17T00:00:00Z',
        start_time: '2025-01-17T00:00:00Z',
        end_time: '2025-01-17T00:00:00Z',
        state: td.state,
      })),
    },
  }) as PipelineRun;

const validStageMap = {
  pipeline_id: 'documents-rag-optimization-pipeline',
  description: 'AutoRAG pipeline',
  kfp_run_id: 'run-123',
  published_at: '2026-06-04T17:47:14.948493Z',
  components: [
    {
      id: 'rag_optimization',
      description: 'Optimize RAG patterns',
      stages: [
        {
          id: 'prepare_search_space',
          description: 'Prepare the search space',
          status: 'completed',
          document_count: 213,
        },
      ],
    },
  ],
};

describe('ComponentStageMapSchema', () => {
  it('should accept a valid stage map payload', () => {
    expect(ComponentStageMapSchema.parse(validStageMap)).toEqual(validStageMap);
  });

  it('should reject null components or stages', () => {
    expect(
      ComponentStageMapSchema.safeParse({
        ...validStageMap,
        components: null,
      }).success,
    ).toBe(false);

    expect(
      ComponentStageMapSchema.safeParse({
        ...validStageMap,
        components: [
          {
            ...validStageMap.components[0],
            stages: null,
          },
        ],
      }).success,
    ).toBe(false);

    expect(
      ComponentStageMapSchema.safeParse({
        ...validStageMap,
        components: [
          null,
          {
            ...validStageMap.components[0],
            stages: [null, validStageMap.components[0].stages[0]],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('should reject components and stages missing required ids', () => {
    expect(
      ComponentStageMapSchema.safeParse({
        ...validStageMap,
        components: [
          {
            description: 'missing id',
            stages: [],
          },
        ],
      }).success,
    ).toBe(false);

    expect(
      ComponentStageMapSchema.safeParse({
        ...validStageMap,
        components: [
          {
            ...validStageMap.components[0],
            stages: [{ description: 'missing id' }],
          },
        ],
      }).success,
    ).toBe(false);
  });
});

describe('isTaskSucceeded', () => {
  it('should return true when task matched by display_name is SUCCEEDED', () => {
    const pipelineRun = createMockPipelineRun([
      { task_id: 'other-id', display_name: TASK_ID, state: 'SUCCEEDED' },
    ]);
    expect(isTaskSucceeded(pipelineRun)).toBe(true);
  });

  it('should return true when task matched by task_id is SUCCEEDED', () => {
    const pipelineRun = createMockPipelineRun([
      { task_id: TASK_ID, display_name: 'some-other-name', state: 'SUCCEEDED' },
    ]);
    expect(isTaskSucceeded(pipelineRun)).toBe(true);
  });

  it('should return false when task is RUNNING', () => {
    const pipelineRun = createMockPipelineRun([
      { task_id: TASK_ID, display_name: TASK_ID, state: 'RUNNING' },
    ]);
    expect(isTaskSucceeded(pipelineRun)).toBe(false);
  });

  it('should return false when task is FAILED', () => {
    const pipelineRun = createMockPipelineRun([
      { task_id: TASK_ID, display_name: TASK_ID, state: 'FAILED' },
    ]);
    expect(isTaskSucceeded(pipelineRun)).toBe(false);
  });

  it('should return false when task is not found', () => {
    const pipelineRun = createMockPipelineRun([
      { task_id: 'unrelated-task', display_name: 'unrelated', state: 'SUCCEEDED' },
    ]);
    expect(isTaskSucceeded(pipelineRun)).toBe(false);
  });

  it('should return false when task_details is empty', () => {
    const pipelineRun = createMockPipelineRun([]);
    expect(isTaskSucceeded(pipelineRun)).toBe(false);
  });

  it('should return false when pipelineRun is undefined', () => {
    expect(isTaskSucceeded(undefined)).toBe(false);
  });
});
/* eslint-enable camelcase */

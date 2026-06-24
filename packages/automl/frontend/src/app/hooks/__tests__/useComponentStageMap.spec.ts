import type { PipelineRun } from '~/app/types';
import { isTaskSucceeded } from '~/app/hooks/useComponentStageMap';

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

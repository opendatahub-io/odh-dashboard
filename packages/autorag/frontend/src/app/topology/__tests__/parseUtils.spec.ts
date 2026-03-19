/* eslint-disable camelcase */
import { RuntimeStateKF } from '~/app/types/pipeline';
import type { RunDetailsKF } from '~/app/types/pipeline';

jest.mock('@patternfly/react-topology', () => ({
  RunStatus: {
    Succeeded: 'Succeeded',
    Failed: 'Failed',
    InProgress: 'InProgress',
    Pending: 'Pending',
    Cancelled: 'Cancelled',
    Skipped: 'Skipped',
  },
}));

// eslint-disable-next-line import/first
import { parseRuntimeInfoFromRunDetails, translateStatusForNode } from '../parseUtils';

const makeRunDetails = (
  ...tasks: { task_id: string; display_name?: string; state?: RuntimeStateKF }[]
): RunDetailsKF => ({
  task_details: tasks.map((t) => ({
    run_id: 'run-1',
    task_id: t.task_id,
    display_name: t.display_name,
    create_time: '2025-01-01T00:00:00Z',
    start_time: '2025-01-01T00:00:01Z',
    end_time: '2025-01-01T00:01:00Z',
    state: t.state,
  })),
});

describe('parseRuntimeInfoFromRunDetails', () => {
  it('should return undefined when runDetails is undefined', () => {
    expect(parseRuntimeInfoFromRunDetails('task-1', undefined)).toBeUndefined();
  });

  it('should return undefined when task_details is undefined', () => {
    const details = {} as RunDetailsKF;
    expect(parseRuntimeInfoFromRunDetails('task-1', details)).toBeUndefined();
  });

  it('should return undefined when task is not found', () => {
    const details = makeRunDetails({ task_id: 'other-task', state: RuntimeStateKF.SUCCEEDED });
    expect(parseRuntimeInfoFromRunDetails('missing-task', details)).toBeUndefined();
  });

  it('should match by task_id', () => {
    const details = makeRunDetails({ task_id: 'my-task', state: RuntimeStateKF.RUNNING });
    const result = parseRuntimeInfoFromRunDetails('my-task', details);

    expect(result).toBeDefined();
    expect(result?.taskId).toBe('my-task');
    expect(result?.state).toBe(RuntimeStateKF.RUNNING);
  });

  it('should match by display_name', () => {
    const details = makeRunDetails({
      task_id: 'internal-id',
      display_name: 'text-extraction',
      state: RuntimeStateKF.SUCCEEDED,
    });
    const result = parseRuntimeInfoFromRunDetails('text-extraction', details);

    expect(result).toBeDefined();
    expect(result?.taskId).toBe('internal-id');
    expect(result?.state).toBe(RuntimeStateKF.SUCCEEDED);
  });

  it('should return startTime and completeTime from task detail', () => {
    const details = makeRunDetails({ task_id: 'task-1', state: RuntimeStateKF.SUCCEEDED });
    const result = parseRuntimeInfoFromRunDetails('task-1', details);

    expect(result?.startTime).toBe('2025-01-01T00:00:01Z');
    expect(result?.completeTime).toBe('2025-01-01T00:01:00Z');
  });
});

describe('translateStatusForNode', () => {
  it('should return undefined for undefined state', () => {
    expect(translateStatusForNode(undefined)).toBeUndefined();
  });

  it('should return undefined for unknown state', () => {
    expect(translateStatusForNode('UNKNOWN_STATE')).toBeUndefined();
  });

  it.each([
    [RuntimeStateKF.SUCCEEDED, 'Succeeded'],
    ['SUCCEEDED', 'Succeeded'],
    [RuntimeStateKF.FAILED, 'Failed'],
    ['FAILED', 'Failed'],
    [RuntimeStateKF.RUNNING, 'InProgress'],
    ['RUNNING', 'InProgress'],
    [RuntimeStateKF.PENDING, 'Pending'],
    ['PENDING', 'Pending'],
    [RuntimeStateKF.CANCELED, 'Cancelled'],
    ['CANCELED', 'Cancelled'],
    [RuntimeStateKF.CANCELING, 'Cancelled'],
    ['CANCELING', 'Cancelled'],
    [RuntimeStateKF.SKIPPED, 'Skipped'],
    ['SKIPPED', 'Skipped'],
    [RuntimeStateKF.CACHED, 'Succeeded'],
    ['CACHED', 'Succeeded'],
    [RuntimeStateKF.PAUSED, 'Pending'],
    ['PAUSED', 'Pending'],
  ])('should translate %s to %s', (input, expected) => {
    expect(translateStatusForNode(input)).toBe(expected);
  });
});

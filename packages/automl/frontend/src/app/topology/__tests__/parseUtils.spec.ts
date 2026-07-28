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
import {
  buildTaskRuntimeById,
  parseRuntimeInfoFromRunDetails,
  resolveTaskTopologyRunStatuses,
  translateStatusForNode,
} from '~/app/topology/parseUtils';

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

const linearDeps = (taskIds: string[]): Map<string, string[]> =>
  new Map(taskIds.map((taskId, index) => [taskId, index > 0 ? [taskIds[index - 1]] : []]));

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

  it('should match driver task by name variant', () => {
    const details = makeRunDetails({
      task_id: 'task-1-driver',
      display_name: 'task-1-driver',
      state: RuntimeStateKF.FAILED,
    });
    const result = parseRuntimeInfoFromRunDetails('task-1', details);

    expect(result).toBeDefined();
    expect(result?.state).toBe(RuntimeStateKF.FAILED);
  });

  it('should pick worst status when main and driver tasks both exist', () => {
    const details = makeRunDetails(
      { task_id: 'task-1', display_name: 'task-1', state: RuntimeStateKF.SUCCEEDED },
      { task_id: 'task-1-driver', display_name: 'task-1-driver', state: RuntimeStateKF.FAILED },
    );
    const result = parseRuntimeInfoFromRunDetails('task-1', details);

    expect(result?.state).toBe(RuntimeStateKF.FAILED);
  });

  it('should keep succeeded when paired with canceled driver status', () => {
    const details = makeRunDetails(
      { task_id: 'task-1', display_name: 'task-1', state: RuntimeStateKF.SUCCEEDED },
      { task_id: 'task-1-driver', display_name: 'task-1-driver', state: RuntimeStateKF.CANCELED },
    );
    const result = parseRuntimeInfoFromRunDetails('task-1', details);

    expect(result?.state).toBe(RuntimeStateKF.SUCCEEDED);
  });

  it('should pick failed over canceled', () => {
    const details = makeRunDetails(
      { task_id: 'task-1', display_name: 'task-1', state: RuntimeStateKF.CANCELED },
      { task_id: 'task-1-driver', display_name: 'task-1-driver', state: RuntimeStateKF.FAILED },
    );
    const result = parseRuntimeInfoFromRunDetails('task-1', details);

    expect(result?.state).toBe(RuntimeStateKF.FAILED);
  });
});

describe('translateStatusForNode', () => {
  it('should return undefined for undefined state', () => {
    expect(translateStatusForNode(undefined)).toBeUndefined();
  });

  it('should return undefined for unknown state', () => {
    expect(translateStatusForNode('UNKNOWN_STATE')).toBeUndefined();
  });

  it('should return undefined for malformed non-string states', () => {
    expect(translateStatusForNode(42 as unknown as RuntimeStateKF)).toBeUndefined();
    expect(translateStatusForNode({} as unknown as RuntimeStateKF)).toBeUndefined();
    expect(translateStatusForNode('   ')).toBeUndefined();
  });

  it.each([
    [RuntimeStateKF.SUCCEEDED, 'Succeeded'],
    ['SUCCEEDED', 'Succeeded'],
    ['succeeded', 'Succeeded'],
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

describe('resolveTaskTopologyRunStatuses', () => {
  it('marks the first DAG task failed when the run failed before task details exist', () => {
    const taskIds = ['publish-component-stage-map', 'automl-data-loader', 'condition-branches-1'];
    const runDetails = makeRunDetails({
      task_id: 'root-driver',
      display_name: 'root-driver',
      state: RuntimeStateKF.FAILED,
    });
    const statuses = resolveTaskTopologyRunStatuses(
      taskIds,
      buildTaskRuntimeById(taskIds, runDetails),
      RuntimeStateKF.FAILED,
      linearDeps(taskIds),
    );

    expect(statuses.get('publish-component-stage-map')).toBe('Failed');
    expect(statuses.get('automl-data-loader')).toBe('Pending');
    expect(statuses.get('condition-branches-1')).toBe('Pending');
  });

  it('keeps later tasks pending after an explicit task failure', () => {
    const taskIds = ['test-data-loader', 'documents-sampling', 'text-extraction'];
    const runDetails = makeRunDetails(
      {
        task_id: 'test-data-loader',
        display_name: 'test-data-loader',
        state: RuntimeStateKF.SUCCEEDED,
      },
      {
        task_id: 'documents-sampling',
        display_name: 'documents-sampling',
        state: RuntimeStateKF.FAILED,
      },
    );
    const statuses = resolveTaskTopologyRunStatuses(
      taskIds,
      buildTaskRuntimeById(taskIds, runDetails),
      RuntimeStateKF.FAILED,
      linearDeps(taskIds),
    );

    expect(statuses.get('test-data-loader')).toBe('Succeeded');
    expect(statuses.get('documents-sampling')).toBe('Failed');
    expect(statuses.get('text-extraction')).toBe('Pending');
  });

  it('leaves unresolved tasks unset when another task failed explicitly on a failed run', () => {
    const taskIds = ['test-data-loader', 'documents-sampling', 'text-extraction'];
    const runDetails = makeRunDetails({
      task_id: 'documents-sampling',
      display_name: 'documents-sampling',
      state: RuntimeStateKF.FAILED,
    });
    const statuses = resolveTaskTopologyRunStatuses(
      taskIds,
      buildTaskRuntimeById(taskIds, runDetails),
      RuntimeStateKF.FAILED,
      linearDeps(taskIds),
    );

    expect(statuses.get('test-data-loader')).toBeUndefined();
    expect(statuses.get('documents-sampling')).toBe('Failed');
    expect(statuses.get('text-extraction')).toBe('Pending');
  });

  it('leaves parallel siblings unset while pending only downstream merge tasks after branch failure', () => {
    const taskIds = ['root', 'branch-a', 'branch-b', 'merge'];
    const depsByTaskId = new Map<string, string[]>([
      ['root', []],
      ['branch-a', ['root']],
      ['branch-b', ['root']],
      ['merge', ['branch-a', 'branch-b']],
    ]);
    const runDetails = makeRunDetails(
      { task_id: 'root', display_name: 'root', state: RuntimeStateKF.SUCCEEDED },
      { task_id: 'branch-a', display_name: 'branch-a', state: RuntimeStateKF.FAILED },
    );
    const statuses = resolveTaskTopologyRunStatuses(
      taskIds,
      buildTaskRuntimeById(taskIds, runDetails),
      RuntimeStateKF.FAILED,
      depsByTaskId,
    );

    expect(statuses.get('root')).toBe('Succeeded');
    expect(statuses.get('branch-a')).toBe('Failed');
    expect(statuses.get('branch-b')).toBeUndefined();
    expect(statuses.get('merge')).toBe('Pending');
  });

  it('infers run-level failure on all eligible parallel branches after a succeeded root', () => {
    const taskIds = ['root', 'branch-b', 'branch-a', 'merge'];
    const depsByTaskId = new Map<string, string[]>([
      ['root', []],
      ['branch-b', ['root']],
      ['branch-a', ['root']],
      ['merge', ['branch-a', 'branch-b']],
    ]);
    const runDetails = makeRunDetails({
      task_id: 'root',
      display_name: 'root',
      state: RuntimeStateKF.SUCCEEDED,
    });
    const statuses = resolveTaskTopologyRunStatuses(
      taskIds,
      buildTaskRuntimeById(taskIds, runDetails),
      RuntimeStateKF.FAILED,
      depsByTaskId,
    );

    expect(statuses.get('root')).toBe('Succeeded');
    expect(statuses.get('branch-a')).toBe('Failed');
    expect(statuses.get('branch-b')).toBe('Failed');
    expect(statuses.get('merge')).toBe('Pending');
  });

  it('preserves explicit in-progress branch statuses after a succeeded root on a failed run', () => {
    const taskIds = ['root', 'branch-a', 'branch-b', 'merge'];
    const depsByTaskId = new Map<string, string[]>([
      ['root', []],
      ['branch-a', ['root']],
      ['branch-b', ['root']],
      ['merge', ['branch-a', 'branch-b']],
    ]);
    const runDetails = makeRunDetails(
      { task_id: 'root', display_name: 'root', state: RuntimeStateKF.SUCCEEDED },
      { task_id: 'branch-a', display_name: 'branch-a', state: RuntimeStateKF.RUNNING },
      { task_id: 'branch-b', display_name: 'branch-b', state: RuntimeStateKF.PENDING },
    );
    const statuses = resolveTaskTopologyRunStatuses(
      taskIds,
      buildTaskRuntimeById(taskIds, runDetails),
      RuntimeStateKF.FAILED,
      depsByTaskId,
    );

    expect(statuses.get('root')).toBe('Succeeded');
    expect(statuses.get('branch-a')).toBe('InProgress');
    expect(statuses.get('branch-b')).toBe('Pending');
    expect(statuses.get('merge')).toBeUndefined();
  });

  it('ignores malformed run-level states when resolving task statuses', () => {
    const taskIds = ['test-data-loader', 'documents-sampling'];
    const statuses = resolveTaskTopologyRunStatuses(
      taskIds,
      buildTaskRuntimeById(taskIds, undefined),
      42 as unknown as string,
      linearDeps(taskIds),
    );

    expect(statuses.get('test-data-loader')).toBeUndefined();
    expect(statuses.get('documents-sampling')).toBeUndefined();
  });
});

/* eslint-disable camelcase */
import {
  ExecutionStateKF,
  PipelineTaskKF,
  RuntimeStateKF,
  TaskStateKF,
} from '#~/concepts/pipelines/kfTypes';
import { taskStateToNodeState } from '#~/concepts/pipelines/topology/parseUtils';
import {
  getEffectiveTaskState,
  buildTaskChildrenIndex,
  MAX_RECURSION_DEPTH,
} from '#~/concepts/pipelines/topology/usePipelineTaskTopology';

const createTask = (taskId: string, state: TaskStateKF, parentTaskId?: string): PipelineTaskKF => ({
  task_id: taskId,
  run_id: 'run-1',
  name: taskId,
  state,
  parent_task_id: parentTaskId,
});

describe('taskStateToNodeState', () => {
  it('should map SUCCEEDED and CACHED to Complete', () => {
    expect(taskStateToNodeState(TaskStateKF.SUCCEEDED)).toBe(ExecutionStateKF.COMPLETE);
    expect(taskStateToNodeState(TaskStateKF.CACHED)).toBe(ExecutionStateKF.COMPLETE);
  });

  it('should map FAILED to Failed', () => {
    expect(taskStateToNodeState(TaskStateKF.FAILED)).toBe(ExecutionStateKF.FAILED);
  });

  it('should map SKIPPED to the skipped run state', () => {
    expect(taskStateToNodeState(TaskStateKF.SKIPPED)).toBe(RuntimeStateKF.SKIPPED);
  });

  it('should map RUNNING to Running', () => {
    expect(taskStateToNodeState(TaskStateKF.RUNNING)).toBe(ExecutionStateKF.RUNNING);
  });

  it('should return undefined for an unspecified state', () => {
    expect(taskStateToNodeState(TaskStateKF.RUNTIME_STATE_UNSPECIFIED)).toBeUndefined();
    expect(taskStateToNodeState(undefined)).toBeUndefined();
  });
});

describe('getEffectiveTaskState', () => {
  describe('terminal states', () => {
    it('should return SUCCEEDED when the task is already SUCCEEDED', () => {
      const task = createTask('1', TaskStateKF.SUCCEEDED);
      expect(getEffectiveTaskState(task, buildTaskChildrenIndex([]))).toBe(TaskStateKF.SUCCEEDED);
    });

    it('should return FAILED when the task is already FAILED', () => {
      const task = createTask('1', TaskStateKF.FAILED);
      expect(getEffectiveTaskState(task, buildTaskChildrenIndex([]))).toBe(TaskStateKF.FAILED);
    });

    it('should return CACHED when the task is already CACHED', () => {
      const task = createTask('1', TaskStateKF.CACHED);
      expect(getEffectiveTaskState(task, buildTaskChildrenIndex([]))).toBe(TaskStateKF.CACHED);
    });
  });

  describe('leaf tasks', () => {
    it('should return RUNNING for a RUNNING leaf', () => {
      const task = createTask('1', TaskStateKF.RUNNING);
      expect(getEffectiveTaskState(task, buildTaskChildrenIndex([task]))).toBe(TaskStateKF.RUNNING);
    });
  });

  describe('parent with children', () => {
    it('should return SUCCEEDED when a RUNNING parent has all SUCCEEDED children', () => {
      const parent = createTask('1', TaskStateKF.RUNNING);
      const child1 = createTask('2', TaskStateKF.SUCCEEDED, '1');
      const child2 = createTask('3', TaskStateKF.SUCCEEDED, '1');

      expect(getEffectiveTaskState(parent, buildTaskChildrenIndex([parent, child1, child2]))).toBe(
        TaskStateKF.SUCCEEDED,
      );
    });

    it('should return FAILED when any child is FAILED and all are terminal', () => {
      const parent = createTask('1', TaskStateKF.RUNNING);
      const child1 = createTask('2', TaskStateKF.SUCCEEDED, '1');
      const child2 = createTask('3', TaskStateKF.FAILED, '1');

      expect(getEffectiveTaskState(parent, buildTaskChildrenIndex([parent, child1, child2]))).toBe(
        TaskStateKF.FAILED,
      );
    });

    it('should return RUNNING when some children are still RUNNING', () => {
      const parent = createTask('1', TaskStateKF.RUNNING);
      const child1 = createTask('2', TaskStateKF.SUCCEEDED, '1');
      const child2 = createTask('3', TaskStateKF.RUNNING, '1');

      expect(getEffectiveTaskState(parent, buildTaskChildrenIndex([parent, child1, child2]))).toBe(
        TaskStateKF.RUNNING,
      );
    });

    it('should return SUCCEEDED when children are a mix of SUCCEEDED and CACHED', () => {
      const parent = createTask('1', TaskStateKF.RUNNING);
      const child1 = createTask('2', TaskStateKF.SUCCEEDED, '1');
      const child2 = createTask('3', TaskStateKF.CACHED, '1');

      expect(getEffectiveTaskState(parent, buildTaskChildrenIndex([parent, child1, child2]))).toBe(
        TaskStateKF.SUCCEEDED,
      );
    });

    it('should use child_tasks when parent_task_id is absent', () => {
      const parent: PipelineTaskKF = {
        ...createTask('1', TaskStateKF.RUNNING),
        child_tasks: [
          { task_id: '2', name: '2' },
          { task_id: '3', name: '3' },
        ],
      };
      const child1 = createTask('2', TaskStateKF.SUCCEEDED);
      const child2 = createTask('3', TaskStateKF.SUCCEEDED);

      expect(getEffectiveTaskState(parent, buildTaskChildrenIndex([parent, child1, child2]))).toBe(
        TaskStateKF.SUCCEEDED,
      );
    });

    it('should keep the parent state when a declared child is not loaded', () => {
      const parent: PipelineTaskKF = {
        ...createTask('1', TaskStateKF.RUNNING),
        child_tasks: [
          { task_id: '2', name: '2' },
          { task_id: '3', name: 'missing' },
        ],
      };
      const child = createTask('2', TaskStateKF.SUCCEEDED);

      expect(getEffectiveTaskState(parent, buildTaskChildrenIndex([parent, child]))).toBe(
        TaskStateKF.RUNNING,
      );
    });
  });

  describe('nested recursion', () => {
    it('should recursively aggregate through nested tasks', () => {
      const parent = createTask('1', TaskStateKF.RUNNING);
      const mid = createTask('2', TaskStateKF.RUNNING, '1');
      const leaf1 = createTask('3', TaskStateKF.SUCCEEDED, '2');
      const leaf2 = createTask('4', TaskStateKF.SUCCEEDED, '2');

      expect(
        getEffectiveTaskState(parent, buildTaskChildrenIndex([parent, mid, leaf1, leaf2])),
      ).toBe(TaskStateKF.SUCCEEDED);
    });

    it('should propagate FAILED from a deeply nested child', () => {
      const root = createTask('1', TaskStateKF.RUNNING);
      const mid = createTask('2', TaskStateKF.RUNNING, '1');
      const leaf1 = createTask('3', TaskStateKF.SUCCEEDED, '2');
      const leaf2 = createTask('4', TaskStateKF.FAILED, '2');

      expect(getEffectiveTaskState(root, buildTaskChildrenIndex([root, mid, leaf1, leaf2]))).toBe(
        TaskStateKF.FAILED,
      );
    });

    it('should return RUNNING when a deeply nested child is still RUNNING', () => {
      const root = createTask('1', TaskStateKF.RUNNING);
      const mid = createTask('2', TaskStateKF.RUNNING, '1');
      const leaf1 = createTask('3', TaskStateKF.SUCCEEDED, '2');
      const leaf2 = createTask('4', TaskStateKF.RUNNING, '2');

      expect(getEffectiveTaskState(root, buildTaskChildrenIndex([root, mid, leaf1, leaf2]))).toBe(
        TaskStateKF.RUNNING,
      );
    });
  });

  describe('cycle protection', () => {
    it('should not loop when parent_task_id creates a cycle', () => {
      const task1 = createTask('1', TaskStateKF.RUNNING, '2');
      const task2 = createTask('2', TaskStateKF.RUNNING, '1');

      expect(getEffectiveTaskState(task1, buildTaskChildrenIndex([task1, task2]))).toBe(
        TaskStateKF.RUNNING,
      );
    });

    it('should handle a self-referencing parent_task_id', () => {
      const task = createTask('1', TaskStateKF.RUNNING, '1');
      expect(getEffectiveTaskState(task, buildTaskChildrenIndex([task]))).toBe(TaskStateKF.RUNNING);
    });
  });

  describe('depth limit', () => {
    it('should respect MAX_RECURSION_DEPTH and return the own state at the limit', () => {
      const depth = MAX_RECURSION_DEPTH + 5;
      const tasks: PipelineTaskKF[] = [];

      for (let i = 0; i < depth; i++) {
        const parentId = i === 0 ? undefined : String(i - 1);
        tasks.push(
          createTask(
            String(i),
            i === depth - 1 ? TaskStateKF.FAILED : TaskStateKF.RUNNING,
            parentId,
          ),
        );
      }

      expect(getEffectiveTaskState(tasks[0], buildTaskChildrenIndex(tasks))).toBe(
        TaskStateKF.RUNNING,
      );
    });
  });
});

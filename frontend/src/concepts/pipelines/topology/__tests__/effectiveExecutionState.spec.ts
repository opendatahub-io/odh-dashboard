import { Execution, Value } from '#~/third_party/mlmd';
import { ExecutionStateKF } from '#~/concepts/pipelines/kfTypes';
import {
  getEffectiveExecutionState,
  buildChildrenIndex,
  executionStateToKF,
  MAX_RECURSION_DEPTH,
} from '#~/concepts/pipelines/topology/usePipelineTaskTopology';

/** Helper: create an Execution with an ID, state, and optional parent_dag_id. */
const createExecution = (
  id: number,
  state: Execution.State,
  parentDagId?: number,
  iterationIndex?: number,
): Execution => {
  const exec = new Execution();
  exec.setId(id);
  exec.setLastKnownState(state);
  exec.setCreateTimeSinceEpoch(Date.now());
  exec.setLastUpdateTimeSinceEpoch(Date.now());

  if (parentDagId != null) {
    const val = new Value();
    exec.getCustomPropertiesMap().set('parent_dag_id', val.setIntValue(parentDagId));
  }
  if (iterationIndex != null) {
    const val = new Value();
    exec.getCustomPropertiesMap().set('iteration_index', val.setIntValue(iterationIndex));
  }
  return exec;
};

describe('executionStateToKF', () => {
  it('should map COMPLETE to ExecutionStateKF.COMPLETE', () => {
    expect(executionStateToKF(Execution.State.COMPLETE)).toBe(ExecutionStateKF.COMPLETE);
  });

  it('should map CACHED to ExecutionStateKF.COMPLETE', () => {
    expect(executionStateToKF(Execution.State.CACHED)).toBe(ExecutionStateKF.COMPLETE);
  });

  it('should map FAILED to ExecutionStateKF.FAILED', () => {
    expect(executionStateToKF(Execution.State.FAILED)).toBe(ExecutionStateKF.FAILED);
  });

  it('should map CANCELED to ExecutionStateKF.CANCELED', () => {
    expect(executionStateToKF(Execution.State.CANCELED)).toBe(ExecutionStateKF.CANCELED);
  });

  it('should map RUNNING to ExecutionStateKF.RUNNING', () => {
    expect(executionStateToKF(Execution.State.RUNNING)).toBe(ExecutionStateKF.RUNNING);
  });

  it('should default to ExecutionStateKF.RUNNING for unknown states', () => {
    expect(executionStateToKF(Execution.State.UNKNOWN)).toBe(ExecutionStateKF.RUNNING);
  });
});

describe('getEffectiveExecutionState', () => {
  describe('terminal states', () => {
    it('should return COMPLETE when execution is already COMPLETE', () => {
      const exec = createExecution(1, Execution.State.COMPLETE);
      expect(getEffectiveExecutionState(exec, buildChildrenIndex([]))).toBe(
        Execution.State.COMPLETE,
      );
    });

    it('should return FAILED when execution is already FAILED', () => {
      const exec = createExecution(1, Execution.State.FAILED);
      expect(getEffectiveExecutionState(exec, buildChildrenIndex([]))).toBe(Execution.State.FAILED);
    });

    it('should return CANCELED when execution is already CANCELED', () => {
      const exec = createExecution(1, Execution.State.CANCELED);
      expect(getEffectiveExecutionState(exec, buildChildrenIndex([]))).toBe(
        Execution.State.CANCELED,
      );
    });

    it('should return CACHED when execution is already CACHED', () => {
      const exec = createExecution(1, Execution.State.CACHED);
      expect(getEffectiveExecutionState(exec, buildChildrenIndex([]))).toBe(Execution.State.CACHED);
    });
  });

  describe('leaf executions (no children)', () => {
    it('should return RUNNING for a RUNNING leaf execution', () => {
      const exec = createExecution(1, Execution.State.RUNNING);
      expect(getEffectiveExecutionState(exec, buildChildrenIndex([exec]))).toBe(
        Execution.State.RUNNING,
      );
    });

    it('should return NEW for a NEW leaf execution', () => {
      const exec = createExecution(1, Execution.State.NEW);
      expect(getEffectiveExecutionState(exec, buildChildrenIndex([exec]))).toBe(
        Execution.State.NEW,
      );
    });
  });

  describe('parent with children (status aggregation)', () => {
    it('should return COMPLETE when RUNNING parent has all COMPLETE children', () => {
      const parent = createExecution(1, Execution.State.RUNNING);
      const child1 = createExecution(2, Execution.State.COMPLETE, 1);
      const child2 = createExecution(3, Execution.State.COMPLETE, 1);

      const allExecs = [parent, child1, child2];
      expect(getEffectiveExecutionState(parent, buildChildrenIndex(allExecs))).toBe(
        Execution.State.COMPLETE,
      );
    });

    it('should return FAILED when any child is FAILED and all are terminal', () => {
      const parent = createExecution(1, Execution.State.RUNNING);
      const child1 = createExecution(2, Execution.State.COMPLETE, 1);
      const child2 = createExecution(3, Execution.State.FAILED, 1);

      const allExecs = [parent, child1, child2];
      expect(getEffectiveExecutionState(parent, buildChildrenIndex(allExecs))).toBe(
        Execution.State.FAILED,
      );
    });

    it('should return CANCELED when any child is CANCELED and none FAILED', () => {
      const parent = createExecution(1, Execution.State.RUNNING);
      const child1 = createExecution(2, Execution.State.COMPLETE, 1);
      const child2 = createExecution(3, Execution.State.CANCELED, 1);

      const allExecs = [parent, child1, child2];
      expect(getEffectiveExecutionState(parent, buildChildrenIndex(allExecs))).toBe(
        Execution.State.CANCELED,
      );
    });

    it('should return RUNNING when some children are still RUNNING', () => {
      const parent = createExecution(1, Execution.State.RUNNING);
      const child1 = createExecution(2, Execution.State.COMPLETE, 1);
      const child2 = createExecution(3, Execution.State.RUNNING, 1);

      const allExecs = [parent, child1, child2];
      expect(getEffectiveExecutionState(parent, buildChildrenIndex(allExecs))).toBe(
        Execution.State.RUNNING,
      );
    });

    it('should return COMPLETE when children are mix of COMPLETE and CACHED', () => {
      const parent = createExecution(1, Execution.State.RUNNING);
      const child1 = createExecution(2, Execution.State.COMPLETE, 1);
      const child2 = createExecution(3, Execution.State.CACHED, 1);

      const allExecs = [parent, child1, child2];
      expect(getEffectiveExecutionState(parent, buildChildrenIndex(allExecs))).toBe(
        Execution.State.COMPLETE,
      );
    });

    it('should prioritize FAILED over CANCELED', () => {
      const parent = createExecution(1, Execution.State.RUNNING);
      const child1 = createExecution(2, Execution.State.FAILED, 1);
      const child2 = createExecution(3, Execution.State.CANCELED, 1);

      const allExecs = [parent, child1, child2];
      expect(getEffectiveExecutionState(parent, buildChildrenIndex(allExecs))).toBe(
        Execution.State.FAILED,
      );
    });
  });

  describe('nested recursion (deeply nested sub-DAGs)', () => {
    it('should recursively aggregate through nested ParallelFor structures', () => {
      // parent (RUNNING) -> mid (RUNNING) -> leaf1 (COMPLETE), leaf2 (COMPLETE)
      const parent = createExecution(1, Execution.State.RUNNING);
      const mid = createExecution(2, Execution.State.RUNNING, 1);
      const leaf1 = createExecution(3, Execution.State.COMPLETE, 2);
      const leaf2 = createExecution(4, Execution.State.COMPLETE, 2);

      const allExecs = [parent, mid, leaf1, leaf2];
      expect(getEffectiveExecutionState(parent, buildChildrenIndex(allExecs))).toBe(
        Execution.State.COMPLETE,
      );
    });

    it('should propagate FAILED from deeply nested child', () => {
      const root = createExecution(1, Execution.State.RUNNING);
      const mid = createExecution(2, Execution.State.RUNNING, 1);
      const leaf1 = createExecution(3, Execution.State.COMPLETE, 2);
      const leaf2 = createExecution(4, Execution.State.FAILED, 2);

      const allExecs = [root, mid, leaf1, leaf2];
      expect(getEffectiveExecutionState(root, buildChildrenIndex(allExecs))).toBe(
        Execution.State.FAILED,
      );
    });

    it('should return RUNNING when a deeply nested child is still RUNNING', () => {
      const root = createExecution(1, Execution.State.RUNNING);
      const mid = createExecution(2, Execution.State.RUNNING, 1);
      const leaf1 = createExecution(3, Execution.State.COMPLETE, 2);
      const leaf2 = createExecution(4, Execution.State.RUNNING, 2);

      const allExecs = [root, mid, leaf1, leaf2];
      expect(getEffectiveExecutionState(root, buildChildrenIndex(allExecs))).toBe(
        Execution.State.RUNNING,
      );
    });
  });

  describe('cycle protection', () => {
    it('should not infinite loop when parent_dag_id creates a cycle', () => {
      // exec1 -> exec2 -> exec1 (cycle)
      const exec1 = createExecution(1, Execution.State.RUNNING);
      const exec2 = createExecution(2, Execution.State.RUNNING, 1);
      // Manually create a cycle: exec1's parent_dag_id = 2
      const cycleVal = new Value();
      exec1.getCustomPropertiesMap().set('parent_dag_id', cycleVal.setIntValue(2));

      const allExecs = [exec1, exec2];
      // Should return without stack overflow
      const result = getEffectiveExecutionState(exec1, buildChildrenIndex(allExecs));
      expect(result).toBe(Execution.State.RUNNING);
    });

    it('should handle self-referencing parent_dag_id', () => {
      const exec = createExecution(1, Execution.State.RUNNING);
      const selfVal = new Value();
      exec.getCustomPropertiesMap().set('parent_dag_id', selfVal.setIntValue(1));

      // exec is its own child — cycle of length 1
      const allExecs = [exec];
      const result = getEffectiveExecutionState(exec, buildChildrenIndex(allExecs));
      expect(result).toBe(Execution.State.RUNNING);
    });
  });

  describe('depth limit', () => {
    it('should respect MAX_RECURSION_DEPTH and return own state at the limit', () => {
      // Create a chain deeper than MAX_RECURSION_DEPTH
      const depth = MAX_RECURSION_DEPTH + 5;
      const executions: Execution[] = [];

      for (let i = 0; i < depth; i++) {
        const parentId = i === 0 ? undefined : i - 1;
        executions.push(
          createExecution(
            i,
            i === depth - 1 ? Execution.State.FAILED : Execution.State.RUNNING,
            parentId,
          ),
        );
      }

      // The root should NOT resolve to FAILED because the chain exceeds MAX_RECURSION_DEPTH
      // At the depth limit, it returns the own state (RUNNING) instead of recursing further
      const result = getEffectiveExecutionState(executions[0], buildChildrenIndex(executions));
      expect(result).toBe(Execution.State.RUNNING);
    });
  });

  describe('empty executions list', () => {
    it('should return own state when allExecutions is empty', () => {
      const exec = createExecution(1, Execution.State.RUNNING);
      expect(getEffectiveExecutionState(exec, buildChildrenIndex([]))).toBe(
        Execution.State.RUNNING,
      );
    });
  });

  describe('multiple branches', () => {
    it('should aggregate across multiple independent child branches', () => {
      // parent -> branch1 (COMPLETE), branch2 -> leaf (COMPLETE)
      const parent = createExecution(1, Execution.State.RUNNING);
      const branch1 = createExecution(2, Execution.State.COMPLETE, 1);
      const branch2 = createExecution(3, Execution.State.RUNNING, 1);
      const leaf = createExecution(4, Execution.State.COMPLETE, 3);

      const allExecs = [parent, branch1, branch2, leaf];
      // branch2 is RUNNING but its only child is COMPLETE, so effective is COMPLETE
      // parent: branch1=COMPLETE, branch2=COMPLETE -> COMPLETE
      expect(getEffectiveExecutionState(parent, buildChildrenIndex(allExecs))).toBe(
        Execution.State.COMPLETE,
      );
    });
  });
});

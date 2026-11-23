/* eslint-disable camelcase */
import { Execution, Value } from '#~/third_party/mlmd';
import {
  executionsForIterationScope,
  iterationScopeForNode,
  resolveIterationExecutionId,
} from '#~/concepts/pipelines/topology/iterationExecutions';

const execution = (
  id: number,
  props: Record<string, { string?: string; int?: number }>,
): Execution => {
  const item = new Execution();
  item.setId(id);
  Object.entries(props).forEach(([key, value]) => {
    const property = new Value();
    if (value.string != null) {
      property.setStringValue(value.string);
    }
    if (value.int != null) {
      property.setIntValue(value.int);
    }
    item.getCustomPropertiesMap().set(key, property);
  });
  return item;
};

describe('executionsForIterationScope', () => {
  const loop = execution(10, { task_name: { string: 'for-loop' }, iteration_count: { int: 2 } });
  const iteration0 = execution(11, { parent_dag_id: { int: 10 }, iteration_index: { int: 0 } });
  const iteration1 = execution(12, { parent_dag_id: { int: 10 }, iteration_index: { int: 1 } });
  const child0 = execution(21, { task_name: { string: 'train' }, parent_dag_id: { int: 11 } });
  const child1 = execution(22, { task_name: { string: 'train' }, parent_dag_id: { int: 12 } });
  const executions = [loop, iteration0, iteration1, child0, child1];

  it('should return every execution when the node is not in an iteration', () => {
    expect(executionsForIterationScope(executions, undefined)).toEqual(executions);
  });

  it('should return only the children of the selected iteration', () => {
    expect(
      executionsForIterationScope(
        executions,
        { iterationTaskName: 'for-loop', iterationIndex: 1 },
        executions,
      ).map((item) => item.getId()),
    ).toEqual([22]);
  });

  it('should return the children of a stored iteration id', () => {
    expect(
      executionsForIterationScope(executions, {
        iterationTaskName: 'for-loop',
        iterationIndex: 0,
        iterationExecutionId: 12,
      }).map((item) => item.getId()),
    ).toEqual([22]);
  });

  it('should return no executions when the iteration cannot be resolved', () => {
    expect(
      executionsForIterationScope(
        executions,
        { iterationTaskName: 'missing-loop', iterationIndex: 0 },
        executions,
      ),
    ).toEqual([]);
  });

  it('should resolve an inner loop from its parent iteration, not the first same-named loop', () => {
    const outerLoop = execution(1, {
      task_name: { string: 'outer' },
      iteration_count: { int: 2 },
    });
    const outerIter0 = execution(10, { parent_dag_id: { int: 1 }, iteration_index: { int: 0 } });
    const outerIter1 = execution(11, { parent_dag_id: { int: 1 }, iteration_index: { int: 1 } });
    const innerLoop0 = execution(20, {
      task_name: { string: 'inner' },
      iteration_count: { int: 1 },
      parent_dag_id: { int: 10 },
    });
    const innerLoop1 = execution(21, {
      task_name: { string: 'inner' },
      iteration_count: { int: 1 },
      parent_dag_id: { int: 11 },
    });
    const innerIter0 = execution(30, { parent_dag_id: { int: 20 }, iteration_index: { int: 0 } });
    const innerIter1 = execution(31, { parent_dag_id: { int: 21 }, iteration_index: { int: 0 } });
    const train0 = execution(40, { task_name: { string: 'train' }, parent_dag_id: { int: 30 } });
    const train1 = execution(41, { task_name: { string: 'train' }, parent_dag_id: { int: 31 } });
    const all = [
      outerLoop,
      outerIter0,
      outerIter1,
      innerLoop0,
      innerLoop1,
      innerIter0,
      innerIter1,
      train0,
      train1,
    ];
    const outerIterationChildren = all.filter(
      (item) => item.getCustomPropertiesMap().get('parent_dag_id')?.getIntValue() === 11,
    );

    expect(
      resolveIterationExecutionId(outerIterationChildren, all, {
        iterationTaskName: 'inner',
        iterationIndex: 0,
      }),
    ).toBe(31);
    expect(
      executionsForIterationScope(
        outerIterationChildren,
        { iterationTaskName: 'inner', iterationIndex: 0 },
        all,
      ).map((item) => item.getId()),
    ).toEqual([41]);
  });
});

describe('iterationScopeForNode', () => {
  const iterationGroup = {
    id: 'loop-iteration-1',
    group: true,
    children: ['loop-iteration-1~train'],
    data: {
      pipelineTask: {
        iterationTaskName: 'for-loop',
        iterationIndex: 1,
        iterationExecutionId: 12,
      },
    },
  };
  const child = { id: 'loop-iteration-1~train' };
  const nodes = [iterationGroup, child];

  it('should read the scope from the iteration group', () => {
    expect(iterationScopeForNode(iterationGroup, nodes)).toEqual({
      iterationTaskName: 'for-loop',
      iterationIndex: 1,
      iterationExecutionId: 12,
    });
  });

  it('should read the scope from the parent iteration group of a child', () => {
    expect(iterationScopeForNode(child, nodes)).toEqual({
      iterationTaskName: 'for-loop',
      iterationIndex: 1,
      iterationExecutionId: 12,
    });
  });

  it('should prefer the inner iteration when two loops share a name', () => {
    const outer = {
      id: 'outer-iteration-1',
      group: true,
      children: ['outer-iteration-1~inner-iteration-0'],
      data: {
        pipelineTask: {
          iterationTaskName: 'loop',
          iterationIndex: 1,
          iterationExecutionId: 11,
        },
      },
    };
    const inner = {
      id: 'outer-iteration-1~inner-iteration-0',
      group: true,
      children: ['outer-iteration-1~inner-iteration-0~train'],
      data: {
        pipelineTask: {
          iterationTaskName: 'loop',
          iterationIndex: 0,
          iterationExecutionId: 31,
        },
      },
    };
    const train = { id: 'outer-iteration-1~inner-iteration-0~train' };

    expect(iterationScopeForNode(train, [outer, inner, train])?.iterationExecutionId).toBe(31);
  });

  it('should return undefined for a node outside an iteration', () => {
    expect(iterationScopeForNode({ id: 'step-a' }, nodes)).toBeUndefined();
    expect(iterationScopeForNode(null, nodes)).toBeUndefined();
  });
});

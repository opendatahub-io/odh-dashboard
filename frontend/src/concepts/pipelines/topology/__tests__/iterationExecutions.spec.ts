/* eslint-disable camelcase */
import { Execution, Value } from '#~/third_party/mlmd';
import {
  executionsForIterationScope,
  iterationScopeForNode,
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
      executionsForIterationScope(executions, {
        iterationTaskName: 'for-loop',
        iterationIndex: 1,
      }).map((item) => item.getId()),
    ).toEqual([22]);
  });

  it('should return no executions when the iteration cannot be resolved', () => {
    expect(
      executionsForIterationScope(executions, {
        iterationTaskName: 'missing-loop',
        iterationIndex: 0,
      }),
    ).toEqual([]);
  });
});

describe('iterationScopeForNode', () => {
  const iterationGroup = {
    id: 'loop-iteration-1',
    group: true,
    children: ['loop-iteration-1~train'],
    data: {
      pipelineTask: { iterationTaskName: 'for-loop', iterationIndex: 1 },
    },
  };
  const child = { id: 'loop-iteration-1~train' };
  const nodes = [iterationGroup, child];

  it('should read the scope from the iteration group', () => {
    expect(iterationScopeForNode(iterationGroup, nodes)).toEqual({
      iterationTaskName: 'for-loop',
      iterationIndex: 1,
    });
  });

  it('should read the scope from the parent iteration group of a child', () => {
    expect(iterationScopeForNode(child, nodes)).toEqual({
      iterationTaskName: 'for-loop',
      iterationIndex: 1,
    });
  });

  it('should return undefined for a node outside an iteration', () => {
    expect(iterationScopeForNode({ id: 'step-a' }, nodes)).toBeUndefined();
    expect(iterationScopeForNode(null, nodes)).toBeUndefined();
  });
});

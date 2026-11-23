import { Execution } from '#~/third_party/mlmd';

/** Spec name and 0-based index of a ParallelFor iteration group. */
export type IterationScope = {
  iterationTaskName: string;
  iterationIndex: number;
};

type IterationTaskFields = {
  iterationIndex?: number;
  iterationTaskName?: string;
};

type IterationNode = {
  id: string;
  group?: boolean;
  children?: string[];
  data?: {
    pipelineTask?: IterationTaskFields;
  };
};

const scopeFromTask = (task?: IterationTaskFields): IterationScope | undefined => {
  if (!task || task.iterationIndex == null || !task.iterationTaskName) {
    return undefined;
  }
  return {
    iterationTaskName: task.iterationTaskName,
    iterationIndex: task.iterationIndex,
  };
};

/**
 * Iteration that owns the selected node. The group itself carries the scope;
 * a child resolves it from the iteration group that lists it.
 */
export const iterationScopeForNode = (
  selectedNode: IterationNode | null | undefined,
  nodes: IterationNode[],
): IterationScope | undefined => {
  if (!selectedNode) {
    return undefined;
  }

  const direct = scopeFromTask(selectedNode.data?.pipelineTask);
  if (direct) {
    return direct;
  }

  const parent = nodes.find(
    (node) =>
      node.group &&
      node.children?.includes(selectedNode.id) &&
      node.data?.pipelineTask?.iterationIndex != null,
  );
  return scopeFromTask(parent?.data?.pipelineTask);
};

/**
 * MLMD executions that belong to one ParallelFor iteration.
 *
 * The loop execution is the one with `iteration_count` and the spec task name.
 * Its child with `iteration_index` is the iteration execution. The drawer and
 * artifact nodes use that iteration's children (`parent_dag_id`).
 * An unresolved scope returns no executions so another iteration is not shown.
 */
export const executionsForIterationScope = (
  executions: Execution[],
  scope: IterationScope | undefined,
): Execution[] => {
  if (!scope) {
    return executions;
  }

  const loopExecution = executions.find((execution) => {
    const props = execution.getCustomPropertiesMap();
    return (
      props.get('task_name')?.getStringValue() === scope.iterationTaskName &&
      props.has('iteration_count')
    );
  });
  if (!loopExecution) {
    return [];
  }

  const iterationExecution = executions.find((execution) => {
    const props = execution.getCustomPropertiesMap();
    return (
      props.get('parent_dag_id')?.getIntValue() === loopExecution.getId() &&
      props.get('iteration_index')?.getIntValue() === scope.iterationIndex
    );
  });
  if (!iterationExecution) {
    return [];
  }

  const iterationId = iterationExecution.getId();
  return executions.filter(
    (execution) =>
      execution.getCustomPropertiesMap().get('parent_dag_id')?.getIntValue() === iterationId,
  );
};

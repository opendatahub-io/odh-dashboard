import { Execution } from '#~/third_party/mlmd';

/** Spec name, 0-based index, and the MLMD execution that is this iteration. */
export type IterationScope = {
  iterationTaskName: string;
  iterationIndex: number;
  /** MLMD id of this iteration execution. Set while the graph is built. */
  iterationExecutionId?: number;
};

type IterationTaskFields = {
  name?: string;
  iterationIndex?: number;
  iterationTaskName?: string;
  iterationExecutionId?: number;
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
    iterationExecutionId: task.iterationExecutionId,
  };
};

/**
 * Iteration that owns the selected node.
 * A nested group walks up to the nearest iteration, so an inner loop is not
 * confused with an outer loop of the same name.
 */
export const iterationScopeForNode = (
  selectedNode: IterationNode | null | undefined,
  nodes: IterationNode[],
  seen: Set<string> = new Set(),
): IterationScope | undefined => {
  if (!selectedNode || seen.has(selectedNode.id)) {
    return undefined;
  }
  seen.add(selectedNode.id);

  const direct = scopeFromTask(selectedNode.data?.pipelineTask);
  if (direct) {
    return direct;
  }

  const parent = nodes.find(
    (node) => node.group && node.id !== selectedNode.id && node.children?.includes(selectedNode.id),
  );
  return parent ? iterationScopeForNode(parent, nodes, seen) : undefined;
};

const childrenOf = (executions: Execution[], parentId: number): Execution[] =>
  executions.filter(
    (execution) =>
      execution.getCustomPropertiesMap().get('parent_dag_id')?.getIntValue() === parentId,
  );

/**
 * MLMD id of one loop iteration.
 *
 * The loop execution is taken from the current graph scope, so an inner loop
 * inside one outer iteration is not the same-named loop in another iteration.
 * The iteration execution itself is read from the full list: it is a grandchild
 * and is not in the current scope.
 */
export const resolveIterationExecutionId = (
  scopeExecutions: Execution[],
  allExecutions: Execution[],
  scope: Pick<IterationScope, 'iterationTaskName' | 'iterationIndex'>,
): number | undefined => {
  const loopExecution = scopeExecutions.find((execution) => {
    const props = execution.getCustomPropertiesMap();
    return (
      props.get('task_name')?.getStringValue() === scope.iterationTaskName &&
      props.has('iteration_count')
    );
  });
  if (!loopExecution) {
    return undefined;
  }

  return allExecutions
    .find((execution) => {
      const props = execution.getCustomPropertiesMap();
      return (
        props.get('parent_dag_id')?.getIntValue() === loopExecution.getId() &&
        props.get('iteration_index')?.getIntValue() === scope.iterationIndex
      );
    })
    ?.getId();
};

/** Executions whose parent is this iteration. An unknown iteration returns none. */
export const executionsUnderIteration = (
  executions: Execution[],
  iterationExecutionId: number | undefined,
): Execution[] =>
  iterationExecutionId == null ? [] : childrenOf(executions, iterationExecutionId);

/**
 * Executions that belong to one ParallelFor iteration.
 * A stored iteration id is authoritative. Otherwise the loop is resolved in
 * `executions` and its descendants are taken from `allExecutions`.
 */
export const executionsForIterationScope = (
  executions: Execution[],
  scope: IterationScope | undefined,
  allExecutions?: Execution[],
): Execution[] => {
  if (!scope) {
    return executions;
  }

  const index = allExecutions ?? executions;
  if (scope.iterationExecutionId != null) {
    return childrenOf(index, scope.iterationExecutionId);
  }
  if (!allExecutions) {
    return [];
  }

  return executionsUnderIteration(
    allExecutions,
    resolveIterationExecutionId(executions, allExecutions, scope),
  );
};

const taskNameOf = (execution: Execution): string | undefined =>
  execution.getCustomPropertiesMap().get('task_name')?.getStringValue();

const parentIdOf = (execution: Execution): number | undefined =>
  execution.getCustomPropertiesMap().get('parent_dag_id')?.getIntValue();

const depthUnderAncestor = (
  executions: Execution[],
  execution: Execution,
  ancestorId: number,
): number => {
  const byId = new Map(executions.map((item) => [item.getId(), item]));
  const seen = new Set<number>();
  let parentId = parentIdOf(execution);
  let depth = 0;
  while (parentId != null && !seen.has(parentId)) {
    depth += 1;
    if (parentId === ancestorId) {
      return depth;
    }
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) {
      return 0;
    }
    parentId = parentIdOf(parent);
  }
  return 0;
};

const isUnderAncestor = (
  executions: Execution[],
  execution: Execution,
  ancestorId: number,
): boolean => depthUnderAncestor(executions, execution, ancestorId) > 0;

/** Executions that belong to one DAG inside a known iteration. Direct iteration children when there is no DAG. */
const executionsForDagInIteration = (
  executions: Execution[],
  iterationExecutionId: number,
  enclosingDagName?: string,
): Execution[] => {
  if (!enclosingDagName) {
    return childrenOf(executions, iterationExecutionId);
  }

  const dagExecution = executions
    .filter(
      (execution) =>
        taskNameOf(execution) === enclosingDagName &&
        isUnderAncestor(executions, execution, iterationExecutionId) &&
        executions.some((child) => parentIdOf(child) === execution.getId()),
    )
    .reduce<Execution | undefined>((nearest, execution) => {
      if (!nearest) {
        return execution;
      }
      return depthUnderAncestor(executions, execution, iterationExecutionId) >
        depthUnderAncestor(executions, nearest, iterationExecutionId)
        ? execution
        : nearest;
    }, undefined);
  if (!dagExecution) {
    return [];
  }
  return childrenOf(executions, dagExecution.getId());
};

/**
 * Executions the task drawer should search.
 * A task on the iteration uses that iteration's direct children.
 * A task inside a regular DAG uses that DAG's children, still limited to this iteration.
 * A node outside an iteration keeps the full list.
 */
export const executionsForSelectedNode = (
  executions: Execution[],
  selectedNode: IterationNode | null | undefined,
  nodes: IterationNode[],
): Execution[] => {
  if (!selectedNode) {
    return executions;
  }

  const direct = scopeFromTask(selectedNode.data?.pipelineTask);
  if (direct?.iterationExecutionId != null) {
    return childrenOf(executions, direct.iterationExecutionId);
  }

  let enclosingDagName: string | undefined;
  let currentId = selectedNode.id;
  const seen = new Set<string>([currentId]);

  for (let hop = 0; hop < nodes.length; hop++) {
    const parent = nodes.find(
      (node) => node.group && !seen.has(node.id) && node.children?.includes(currentId),
    );
    if (!parent) {
      return executions;
    }
    seen.add(parent.id);

    const parentScope = scopeFromTask(parent.data?.pipelineTask);
    if (parentScope?.iterationExecutionId != null) {
      return executionsForDagInIteration(
        executions,
        parentScope.iterationExecutionId,
        enclosingDagName,
      );
    }
    if (!enclosingDagName && parent.data?.pipelineTask?.name) {
      enclosingDagName = parent.data.pipelineTask.name;
    }
    currentId = parent.id;
  }

  return executions;
};

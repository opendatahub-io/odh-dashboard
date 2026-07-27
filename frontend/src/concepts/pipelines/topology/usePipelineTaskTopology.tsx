import * as React from 'react';
import * as _ from 'lodash-es';
import {
  ExecutionStateKF,
  InputOutputArtifactType,
  InputOutputDefinitionArtifacts,
  PipelineComponentsKF,
  PipelineExecutorsKF,
  PipelineSpecVariable,
  RunDetailsKF,
  TaskKF,
} from '#~/concepts/pipelines/kfTypes';
import { createNode } from '#~/concepts/topology';
import { PipelineNodeModelExpanded } from '#~/concepts/topology/types';
import { createArtifactNode, createGroupNode } from '#~/concepts/topology/utils';
import { Artifact, Execution, Event } from '#~/third_party/mlmd';
import { LinkedArtifact } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { parseEventsByType } from '#~/pages/pipelines/global/experiments/executions/utils';
import {
  ComponentArtifactMap,
  composeArtifactType,
  filterEventWithInputArtifact,
  filterEventWithOutputArtifact,
  findIterationExecution,
  findParallelForDagExecution,
  getExecutionLinkedArtifactMap,
  getIterationCount,
  idForTaskArtifact,
  parseComponentsForArtifactRelationship,
  parseInputOutput,
  parseRuntimeInfoFromExecutions,
  parseRuntimeInfoFromRunDetails,
  parseTasksForArtifactRelationship,
  parseVolumeMounts,
  TaskArtifactMap,
  translateStatusForNode,
} from './parseUtils';
import { PipelineTask } from './pipelineTaskTypes';

/**
 * Determine the effective state of an execution, recursively checking nested
 * ParallelFor structures.  If the execution itself is RUNNING but all of its
 * children (direct task executions **and** nested iteration executions) have
 * reached a terminal state, the effective state is derived from those children.
 *
 * A `visited` set prevents infinite recursion if MLMD data contains cycles,
 * and a depth cap (MAX_RECURSION_DEPTH) guards against pathologically deep
 * nesting that could overflow the call stack.
 */
export const MAX_RECURSION_DEPTH = 20;

/**
 * Build a lookup from parent execution ID → child executions.
 * Call once before recursing so child lookups are O(1) instead of O(n).
 */
export const buildChildrenIndex = (allExecutions: Execution[]): Map<number, Execution[]> => {
  const index = new Map<number, Execution[]>();
  allExecutions.forEach((e) => {
    const pid = e.getCustomPropertiesMap().get('parent_dag_id')?.getIntValue();
    if (pid != null) {
      const list = index.get(pid);
      if (list) {
        list.push(e);
      } else {
        index.set(pid, [e]);
      }
    }
  });
  return index;
};

export const getEffectiveExecutionState = (
  execution: Execution,
  childrenIndex: Map<number, Execution[]>,
  visited: Set<number> = new Set(),
  depth = 0,
): Execution.State => {
  const ownState = execution.getLastKnownState();
  const execId = execution.getId();

  // Guard: cycle detection or depth limit exceeded — return state as-is.
  if (visited.has(execId) || depth >= MAX_RECURSION_DEPTH) {
    return ownState;
  }
  visited.add(execId);

  // If already terminal, nothing to aggregate.
  if (
    ownState === Execution.State.COMPLETE ||
    ownState === Execution.State.FAILED ||
    ownState === Execution.State.CANCELED ||
    ownState === Execution.State.CACHED
  ) {
    return ownState;
  }

  const children = childrenIndex.get(execId) ?? [];

  // No children means a leaf or an execution we can't introspect — keep the
  // original state.
  if (children.length === 0) {
    return ownState;
  }

  // Recursively resolve each child's effective state.
  const childStates = children.map((c) =>
    getEffectiveExecutionState(c, childrenIndex, visited, depth + 1),
  );

  const anyFailed = childStates.includes(Execution.State.FAILED);
  const anyCanceled = childStates.includes(Execution.State.CANCELED);
  const allTerminal = childStates.every(
    (s) =>
      s === Execution.State.COMPLETE ||
      s === Execution.State.FAILED ||
      s === Execution.State.CANCELED ||
      s === Execution.State.CACHED,
  );

  if (!allTerminal) {
    return ownState; // still genuinely running
  }
  if (anyFailed) {
    return Execution.State.FAILED;
  }
  if (anyCanceled) {
    return Execution.State.CANCELED;
  }
  return Execution.State.COMPLETE;
};

/**
 * Map an Execution.State enum value to the ExecutionStateKF string used by the
 * topology UI.
 */
export const executionStateToKF = (state: Execution.State): ExecutionStateKF => {
  switch (state) {
    case Execution.State.COMPLETE:
    case Execution.State.CACHED:
      return ExecutionStateKF.COMPLETE;
    case Execution.State.FAILED:
      return ExecutionStateKF.FAILED;
    case Execution.State.CANCELED:
      return ExecutionStateKF.CANCELED;
    case Execution.State.RUNNING:
      return ExecutionStateKF.RUNNING;
    case Execution.State.NEW:
      return ExecutionStateKF.NEW;
    default:
      return ExecutionStateKF.RUNNING;
  }
};

const getArtifactPipelineTask = (
  name: string,
  artifactType: InputOutputArtifactType,
  artifactData?: Artifact,
): PipelineTask => ({
  type: 'artifact',
  name,
  metadata: artifactData,
  inputs: {
    artifacts: [{ label: name, type: composeArtifactType(artifactType) }],
  },
});

/**
 * Get the artifact nodes without the inputs from a task node
 */
const getInputArtifacts = (
  groupId: string | undefined,
  inputArtifacts: InputOutputDefinitionArtifacts | undefined,
) => {
  if (!inputArtifacts) {
    return [];
  }

  return Object.entries(inputArtifacts).map(([artifactKey, { artifactType }]) =>
    createArtifactNode(
      idForTaskArtifact(groupId, '', artifactKey),
      artifactKey,
      getArtifactPipelineTask(artifactKey, artifactType),
      artifactType.schemaTitle,
      undefined,
    ),
  );
};

const getTaskArtifacts = (
  groupId: string | undefined,
  taskId: string,
  taskName: string,
  componentRef: string,
  componentArtifactMap: ComponentArtifactMap,
  artifacts?: Artifact[],
  events?: Event[] | null,
  executions?: Execution[] | null,
): PipelineNodeModelExpanded[] => {
  const artifactsInComponent = componentArtifactMap[componentRef];

  if (!artifactsInComponent) {
    return [];
  }

  const execution = executions?.find(
    (e) => e.getCustomPropertiesMap().get('task_name')?.getStringValue() === (taskName || taskId),
  );

  const executionEvents = events?.filter((event) => event.getExecutionId() === execution?.getId());

  return Object.entries(artifactsInComponent).map(([artifactKey, data]) => {
    const artifactData = artifacts?.find((artifact) => {
      const artifactEvent = executionEvents?.find(
        (event) => event.getArtifactId() === artifact.getId(),
      );

      return artifactEvent && artifact.getType() === data.schemaTitle;
    });

    return createArtifactNode(
      idForTaskArtifact(groupId, taskId, artifactKey),
      artifactKey,
      getArtifactPipelineTask(artifactKey, data, artifactData),
      data.schemaTitle,
      [taskId],
    );
  });
};

const getNodesForTasks = (
  groupId: string | undefined,
  spec: PipelineSpecVariable,
  items: Record<string, TaskKF>,
  components: PipelineComponentsKF,
  executors: PipelineExecutorsKF,
  componentArtifactMap: ComponentArtifactMap,
  taskArtifactMap: TaskArtifactMap,
  executionLinkedArtifactMap: Record<number, LinkedArtifact[]>,
  runDetails?: RunDetailsKF,
  executions?: Execution[] | null,
  inputArtifacts?: InputOutputDefinitionArtifacts,
  events?: Event[] | null,
  artifacts?: Artifact[],
  allExecutions?: Execution[] | null,
  childIndex?: Map<number, Execution[]>,
): [nestedNodes: PipelineNodeModelExpanded[], children: string[]] => {
  const nodes: PipelineNodeModelExpanded[] = [];
  const children: string[] = [];

  Object.entries(items).forEach(([taskId, details]) => {
    const componentRef = details.componentRef.name;
    const component = components[componentRef];
    const taskName = details.taskInfo.name;

    const status =
      parseRuntimeInfoFromExecutions(taskId, taskName, executions) ||
      parseRuntimeInfoFromRunDetails(taskId, runDetails);
    const runStatus = translateStatusForNode(status?.state);

    // add edges from one task to its parent tasks
    const runAfter: string[] =
      details.dependentTasks?.filter((t) => Object.keys(items).includes(t)) ?? [];
    const hasSubTask =
      Object.keys(components).find((task) => task === componentRef) &&
      components[componentRef]?.dag;
    const subTasks = components[componentRef]?.dag?.tasks;
    const executorLabel = component?.executorLabel;
    const executor = executorLabel ? executors[executorLabel] : undefined;

    let linkedArtifacts: LinkedArtifact[] = [];
    if (executions) {
      const execution = executions.find(
        (e) =>
          e.getCustomPropertiesMap().get('task_name')?.getStringValue() === (taskName || taskId),
      );
      if (execution) {
        linkedArtifacts = executionLinkedArtifactMap[execution.getId()] ?? [];
      }
    }

    const pipelineTask: PipelineTask = {
      type: 'groupTask',
      name: taskName,
      steps: executor?.container ? [executor.container] : undefined,
      inputs: component?.inputDefinitions
        ? parseInputOutput(
            component.inputDefinitions,
            filterEventWithInputArtifact(linkedArtifacts),
          )
        : undefined,
      outputs: component?.outputDefinitions
        ? parseInputOutput(
            component.outputDefinitions,
            filterEventWithOutputArtifact(linkedArtifacts),
          )
        : undefined,
      status,
      volumeMounts: parseVolumeMounts(spec.platform_spec, executorLabel),
    };

    // Build artifact nodes with inputs from task nodes
    const artifactNodes = getTaskArtifacts(
      groupId,
      taskId,
      taskName,
      componentRef,
      componentArtifactMap,
      artifacts,
      events,
      executions,
    );
    if (artifactNodes.length) {
      nodes.push(...artifactNodes);
      children.push(...artifactNodes.map((n) => n.id));
    }

    // Build artifact nodes without inputs
    const inputArtifactNodes = getInputArtifacts(groupId, inputArtifacts);
    if (inputArtifactNodes.length) {
      nodes.push(...inputArtifactNodes);
      children.push(...inputArtifactNodes.map((n) => n.id));
    }

    // Read the artifact-task map we built before
    // Add edge from artifact to task
    const artifactToTaskEdges = taskArtifactMap[taskId]?.map((v) => v.artifactNodeId) ?? [];
    runAfter.push(...artifactToTaskEdges);

    if (hasSubTask && subTasks) {
      const dagExecution = findParallelForDagExecution(taskName, taskId, executions);
      const iterCount = dagExecution ? getIterationCount(dagExecution) : undefined;
      pipelineTask.isSubDag = true;

      // Fix: DAG executions (ParallelFor, Condition, sub-DAG) often stay in
      // RUNNING state even after all children complete.  Find the sub-DAG's
      // own execution and recursively derive its effective status.
      const fullExecs = allExecutions ?? executions ?? [];
      const resolvedChildIndex = childIndex ?? buildChildrenIndex(fullExecs);
      const subDagExecution =
        dagExecution ??
        fullExecs.find(
          (e) =>
            e.getCustomPropertiesMap().get('task_name')?.getStringValue() === (taskName || taskId),
        );
      if (subDagExecution) {
        const effectiveState = getEffectiveExecutionState(subDagExecution, resolvedChildIndex);
        const aggregateState = executionStateToKF(effectiveState);
        const isTerminal =
          effectiveState === Execution.State.COMPLETE ||
          effectiveState === Execution.State.FAILED ||
          effectiveState === Execution.State.CANCELED ||
          effectiveState === Execution.State.CACHED;

        pipelineTask.status = {
          startTime: new Date(subDagExecution.getCreateTimeSinceEpoch()).toISOString(),
          completeTime: isTerminal
            ? new Date(subDagExecution.getLastUpdateTimeSinceEpoch()).toISOString()
            : undefined,
          state: aggregateState,
          taskId: `task.${taskId}`,
        };
      }

      if (iterCount != null && iterCount > 0) {
        pipelineTask.iterationCount = iterCount;
      }

      // ParallelFor: synthesize iteration sub-groups as children of the group.
      // Cap the rendered iterations to avoid freezing the UI with very large loops.
      const MAX_INLINE_ITERATIONS = 100;

      if (iterCount != null && iterCount > 0 && dagExecution) {
        const parentDagId = dagExecution.getId();
        const iterationNodes: PipelineNodeModelExpanded[] = [];
        const iterationChildIds: string[] = [];
        const renderCount = Math.min(iterCount, MAX_INLINE_ITERATIONS);

        for (let i = 0; i < renderCount; i++) {
          const iterExecution = findIterationExecution(parentDagId, i, fullExecs);
          const iterNodeId = `${taskId}-iteration-${i}`;

          // Build status for the iteration node — use recursive aggregation so
          // nested ParallelFor structures that are stuck in RUNNING resolve correctly.
          let iterStatus: PipelineTask['status'];
          let iterRunStatus;
          if (iterExecution) {
            const effectiveState = getEffectiveExecutionState(iterExecution, resolvedChildIndex);
            const effectiveStateKF = executionStateToKF(effectiveState);
            const isTerminal =
              effectiveState === Execution.State.COMPLETE ||
              effectiveState === Execution.State.FAILED ||
              effectiveState === Execution.State.CANCELED ||
              effectiveState === Execution.State.CACHED;

            iterStatus = {
              startTime: new Date(iterExecution.getCreateTimeSinceEpoch()).toISOString(),
              completeTime: isTerminal
                ? new Date(iterExecution.getLastUpdateTimeSinceEpoch()).toISOString()
                : undefined,
              state: effectiveStateKF,
              taskId: `iteration.${i}`,
            };
            iterRunStatus = translateStatusForNode(effectiveStateKF);
          }

          // Scope executions to this iteration's parent_dag_id.
          // Filter from the full list so nested children are reachable.
          // Fall back to the parent execution list (or empty array) when the
          // iteration execution hasn't been created yet.
          const iterParentDagId = iterExecution?.getId();
          const scopedExecutions =
            iterParentDagId != null
              ? fullExecs.filter((e) => {
                  const pid = e.getCustomPropertiesMap().get('parent_dag_id')?.getIntValue();
                  return pid === iterParentDagId;
                })
              : executions ?? [];

          const iterLabel = `${taskName} #${i + 1}`;
          const iterPipelineTask: PipelineTask = {
            type: 'groupTask',
            name: iterLabel,
            status: iterStatus,
            isSubDag: false,
            iterationParentDagId: iterParentDagId,
          };

          // Create prefixed task entries so child node IDs are unique per iteration.
          // Without this, all iterations share the same child ID (e.g. "first-pipeline")
          // and PatternFly assigns the child to only the last parent.
          const prefixedSubTasks: Record<string, TaskKF> = {};
          for (const [subTaskId, subTaskDetails] of Object.entries(subTasks)) {
            // Prefix producerTask references inside artifact inputs so edges
            // resolve to the correct prefixed artifact node IDs.
            let prefixedInputs = subTaskDetails.inputs;
            if (subTaskDetails.inputs?.artifacts) {
              const prefixedArtifacts: Record<
                string,
                (typeof subTaskDetails.inputs.artifacts)[string]
              > = {};
              for (const [artKey, artValue] of Object.entries(subTaskDetails.inputs.artifacts)) {
                if (artValue.taskOutputArtifact) {
                  prefixedArtifacts[artKey] = {
                    ...artValue,
                    taskOutputArtifact: {
                      ...artValue.taskOutputArtifact,
                      producerTask: `${iterNodeId}~${artValue.taskOutputArtifact.producerTask}`,
                    },
                  };
                } else {
                  prefixedArtifacts[artKey] = artValue;
                }
              }
              prefixedInputs = { ...subTaskDetails.inputs, artifacts: prefixedArtifacts };
            }

            prefixedSubTasks[`${iterNodeId}~${subTaskId}`] = {
              ...subTaskDetails,
              inputs: prefixedInputs,
              dependentTasks: subTaskDetails.dependentTasks?.map((dep) => `${iterNodeId}~${dep}`),
            };
          }

          const subTasksArtifactMap = parseTasksForArtifactRelationship(
            iterNodeId,
            prefixedSubTasks,
          );
          const [nestedNodes, taskChildren] = getNodesForTasks(
            iterNodeId,
            spec,
            prefixedSubTasks,
            components,
            executors,
            componentArtifactMap,
            subTasksArtifactMap,
            executionLinkedArtifactMap,
            runDetails,
            scopedExecutions,
            component?.inputDefinitions?.artifacts,
            events,
            artifacts,
            allExecutions ?? executions,
            resolvedChildIndex,
          );

          const iterGroupNode = createGroupNode(
            iterNodeId,
            iterLabel,
            iterPipelineTask,
            undefined,
            iterRunStatus,
            taskChildren,
          );
          iterationNodes.push(iterGroupNode, ...nestedNodes);
          iterationChildIds.push(iterNodeId);
        }

        // Recompute runStatus from the (possibly aggregated) pipelineTask.status
        const groupRunStatus = translateStatusForNode(pipelineTask.status?.state) ?? runStatus;

        const itemNode = createGroupNode(
          taskId,
          taskName,
          pipelineTask,
          runAfter,
          groupRunStatus,
          iterationChildIds,
        );
        nodes.push(itemNode, ...iterationNodes);
      } else {
        // Regular sub-DAG without ParallelFor iterations:
        // recurse into template tasks directly
        const subTasksArtifactMap = parseTasksForArtifactRelationship(taskId, subTasks);

        const [nestedNodes, taskChildren] = getNodesForTasks(
          taskId,
          spec,
          subTasks,
          components,
          executors,
          componentArtifactMap,
          subTasksArtifactMap,
          executionLinkedArtifactMap,
          runDetails,
          executions,
          component?.inputDefinitions?.artifacts,
          events,
          artifacts,
          allExecutions ?? executions,
          resolvedChildIndex,
        );

        // Recompute runStatus from the (possibly aggregated) pipelineTask.status
        const groupRunStatus = translateStatusForNode(pipelineTask.status?.state) ?? runStatus;

        const itemNode = createGroupNode(
          taskId,
          taskName,
          pipelineTask,
          runAfter,
          groupRunStatus,
          taskChildren,
        );
        nodes.push(itemNode, ...nestedNodes);
      }
    } else {
      nodes.push(createNode(taskId, taskName, pipelineTask, runAfter, runStatus));
    }
    children.push(taskId);
  });

  return [nodes, children];
};

export const usePipelineTaskTopology = (
  spec?: PipelineSpecVariable,
  runDetails?: RunDetailsKF,
  executions?: Execution[] | null,
  events?: Event[] | null,
  artifacts?: Artifact[],
): PipelineNodeModelExpanded[] =>
  React.useMemo(() => {
    if (!spec) {
      return [];
    }
    const pipelineSpec = spec.pipeline_spec ?? spec;
    let components: PipelineComponentsKF;
    let executors: PipelineExecutorsKF;
    let tasks: Record<string, TaskKF>;
    let inputDefinitions: { artifacts?: InputOutputDefinitionArtifacts } | undefined;

    try {
      ({
        components,
        deploymentSpec: { executors },
        root: {
          dag: { tasks },
          inputDefinitions,
        },
      } = pipelineSpec);
    } catch (e) {
      return [];
    }

    const outputEvents = parseEventsByType(events ?? [])[Event.Type.OUTPUT];

    const componentArtifactMap = parseComponentsForArtifactRelationship(components);
    const taskArtifactMap = parseTasksForArtifactRelationship('root', tasks);
    const executionLinkedArtifactMap = getExecutionLinkedArtifactMap(artifacts, events);
    const topLevelChildIndex = executions ? buildChildrenIndex(executions) : undefined;

    return _.uniqBy(
      getNodesForTasks(
        'root',
        spec,
        tasks,
        components,
        executors,
        componentArtifactMap,
        taskArtifactMap,
        executionLinkedArtifactMap,
        runDetails,
        executions,
        inputDefinitions?.artifacts,
        outputEvents,
        artifacts,
        executions,
        topLevelChildIndex,
      )[0],
      (node) => node.id,
    );
  }, [artifacts, events, executions, runDetails, spec]);

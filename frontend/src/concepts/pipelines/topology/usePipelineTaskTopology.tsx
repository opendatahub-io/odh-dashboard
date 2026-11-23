import * as React from 'react';
import * as _ from 'lodash-es';
import {
  InputOutputArtifactType,
  InputOutputDefinitionArtifacts,
  PipelineComponentsKF,
  PipelineExecutorsKF,
  PipelineSpecVariable,
  PipelineTaskKF,
  RunDetailsKF,
  TaskKF,
  TaskPodTypeKF,
  TaskStateKF,
} from '#~/concepts/pipelines/kfTypes';
import { createNode } from '#~/concepts/topology';
import { PipelineNodeModelExpanded } from '#~/concepts/topology/types';
import { createArtifactNode, createGroupNode } from '#~/concepts/topology/utils';
import { Artifact, Event, Execution } from '#~/third_party/mlmd';
import { LinkedArtifact } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { parseEventsByType } from '#~/pages/pipelines/global/experiments/executions/utils';
import {
  ComponentArtifactMap,
  composeArtifactType,
  filterEventWithInputArtifact,
  filterEventWithOutputArtifact,
  findIterationTask,
  findParallelForTask,
  getExecutionLinkedArtifactMap,
  getIterationCount,
  idForTaskArtifact,
  parseComponentsForArtifactRelationship,
  parseInputOutput,
  parseRuntimeInfoFromTasks,
  parseRuntimeInfoFromRunDetails,
  parseTasksForArtifactRelationship,
  parseVolumeMounts,
  TaskArtifactMap,
  taskStateToNodeState,
  tasksInScope,
  translateStatusForNode,
} from './parseUtils';
import { executionsForIterationScope, resolveIterationExecutionId } from './iterationExecutions';
import { PipelineTask } from './pipelineTaskTypes';

/**
 * MLMD records still supply artifact instances. Node status comes from PipelineTask.
 * The artifact drawer reads `metadata` until it moves to Artifact resources.
 */
type MlmdArtifactContext = {
  executionLinkedArtifactMap: Record<number, LinkedArtifact[]>;
  events?: Event[] | null;
  artifacts?: Artifact[];
  /** Executions visible at this graph scope. Iteration recursion narrows the list. */
  executions?: Execution[] | null;
  /** Every execution for the run. Nested loops resolve grandchildren from this list. */
  allExecutions?: Execution[] | null;
};

/**
 * Effective state of a task. A non-terminal parent whose children are all terminal
 * takes FAILED if any child failed, otherwise SUCCEEDED (CACHED counts as success).
 *
 * `visited` stops cycles. MAX_RECURSION_DEPTH stops a pathologically deep tree.
 */
export const MAX_RECURSION_DEPTH = 20;

const isTerminalTaskState = (state: TaskStateKF): boolean =>
  state === TaskStateKF.SUCCEEDED ||
  state === TaskStateKF.FAILED ||
  state === TaskStateKF.CACHED ||
  state === TaskStateKF.SKIPPED;

type TaskChild = PipelineTaskKF | { missing: true; taskId: string };

const isLoadedTask = (child: TaskChild): child is PipelineTaskKF => !('missing' in child);

/**
 * Children keyed by parent task id. A link counts when `parent_task_id` is set
 * or the parent lists the child in `child_tasks`. A declared child that was not
 * loaded stays in the index so a parent is not marked finished without it.
 */
export const buildTaskChildrenIndex = (allTasks: PipelineTaskKF[]): Map<string, TaskChild[]> => {
  const byId = new Map(allTasks.map((task) => [task.task_id, task]));
  const index = new Map<string, TaskChild[]>();
  const seen = new Map<string, Set<string>>();

  const add = (parentId: string, childId: string, child: TaskChild) => {
    const ids = seen.get(parentId) ?? new Set<string>();
    if (ids.has(childId)) {
      return;
    }
    ids.add(childId);
    seen.set(parentId, ids);
    const list = index.get(parentId);
    if (list) {
      list.push(child);
    } else {
      index.set(parentId, [child]);
    }
  };

  allTasks.forEach((task) => {
    if (task.parent_task_id) {
      add(task.parent_task_id, task.task_id, task);
    }
    task.child_tasks?.forEach((childRef) => {
      const child = byId.get(childRef.task_id);
      add(task.task_id, childRef.task_id, child ?? { missing: true, taskId: childRef.task_id });
    });
  });

  return index;
};

export const getEffectiveTaskState = (
  task: PipelineTaskKF,
  childrenIndex: Map<string, TaskChild[]>,
  visited: Set<string> = new Set(),
  depth = 0,
): TaskStateKF => {
  const ownState = task.state ?? TaskStateKF.RUNTIME_STATE_UNSPECIFIED;

  if (visited.has(task.task_id) || depth >= MAX_RECURSION_DEPTH) {
    return ownState;
  }
  visited.add(task.task_id);

  if (isTerminalTaskState(ownState)) {
    return ownState;
  }

  const children = childrenIndex.get(task.task_id) ?? [];
  if (children.length === 0 || children.some((child) => !isLoadedTask(child))) {
    return ownState;
  }

  const childStates = children
    .filter(isLoadedTask)
    .map((child) => getEffectiveTaskState(child, childrenIndex, visited, depth + 1));

  if (!childStates.every(isTerminalTaskState)) {
    return ownState;
  }
  if (childStates.includes(TaskStateKF.FAILED)) {
    return TaskStateKF.FAILED;
  }
  if (childStates.every((state) => state === TaskStateKF.SKIPPED)) {
    return TaskStateKF.SKIPPED;
  }
  return TaskStateKF.SUCCEEDED;
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
  mlmd?: MlmdArtifactContext,
): PipelineNodeModelExpanded[] => {
  const artifactsInComponent = componentArtifactMap[componentRef];

  if (!artifactsInComponent) {
    return [];
  }

  const execution = mlmd?.executions?.find(
    (item) =>
      item.getCustomPropertiesMap().get('task_name')?.getStringValue() === (taskName || taskId),
  );
  const executionEvents = mlmd?.events?.filter(
    (event) => event.getExecutionId() === execution?.getId(),
  );

  return Object.entries(artifactsInComponent).map(([artifactKey, data]) => {
    const artifactData = mlmd?.artifacts?.find((artifact) => {
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
  runDetails?: RunDetailsKF,
  tasks?: PipelineTaskKF[] | null,
  inputArtifacts?: InputOutputDefinitionArtifacts,
  allTasks?: PipelineTaskKF[] | null,
  childIndex?: Map<string, TaskChild[]>,
  mlmd?: MlmdArtifactContext,
): [nestedNodes: PipelineNodeModelExpanded[], children: string[]] => {
  const nodes: PipelineNodeModelExpanded[] = [];
  const children: string[] = [];

  Object.entries(items).forEach(([taskId, details]) => {
    const componentRef = details.componentRef.name;
    const component = components[componentRef];
    const taskName = details.taskInfo.name;

    const status =
      parseRuntimeInfoFromTasks(taskId, taskName, tasks) ||
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
    if (mlmd?.executions) {
      const execution = mlmd.executions.find(
        (item) =>
          item.getCustomPropertiesMap().get('task_name')?.getStringValue() === (taskName || taskId),
      );
      if (execution) {
        linkedArtifacts = mlmd.executionLinkedArtifactMap[execution.getId()] ?? [];
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
      mlmd,
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
      const loopTask = findParallelForTask(taskName, taskId, tasks);
      const iterCount = loopTask ? getIterationCount(loopTask) : undefined;
      pipelineTask.isSubDag = true;

      // Group tasks often stay RUNNING after their children finish.
      const fullTasks = allTasks ?? tasks ?? [];
      const resolvedChildIndex = childIndex ?? buildTaskChildrenIndex(fullTasks);
      const groupTask =
        loopTask ??
        (tasks ?? []).find(
          (task) =>
            task.display_name === (taskName || taskId) || task.name === (taskName || taskId),
        );
      if (groupTask) {
        const effectiveState = getEffectiveTaskState(groupTask, resolvedChildIndex);
        const effectiveNodeState = taskStateToNodeState(effectiveState);
        // Unspecified runtime state has nothing to add. Keep run_details when it supplied status.
        if (effectiveNodeState) {
          const isTerminal =
            effectiveState === TaskStateKF.SUCCEEDED ||
            effectiveState === TaskStateKF.FAILED ||
            effectiveState === TaskStateKF.CACHED ||
            effectiveState === TaskStateKF.SKIPPED;

          pipelineTask.status = {
            startTime: groupTask.create_time ?? '',
            completeTime: isTerminal ? groupTask.end_time : undefined,
            state: effectiveNodeState,
            taskId: `task.${taskId}`,
            podName:
              groupTask.pods?.find((pod) => pod.type === TaskPodTypeKF.EXECUTOR)?.name ??
              groupTask.pods?.[0]?.name,
          };
        }
      }

      if (iterCount != null && iterCount > 0) {
        pipelineTask.iterationCount = iterCount;
      }

      // ParallelFor: synthesize iteration sub-groups as children of the group.
      // Cap the rendered iterations to avoid freezing the UI with very large loops.
      const MAX_INLINE_ITERATIONS = 100;

      if (iterCount != null && iterCount > 0 && loopTask) {
        const parentTaskId = loopTask.task_id;
        const iterationNodes: PipelineNodeModelExpanded[] = [];
        const iterationChildIds: string[] = [];
        const renderCount = Math.min(iterCount, MAX_INLINE_ITERATIONS);

        for (let i = 0; i < renderCount; i++) {
          const iterTask = findIterationTask(parentTaskId, i, fullTasks);
          const iterNodeId = `${taskId}-iteration-${i}`;

          let iterStatus: PipelineTask['status'];
          let iterRunStatus;
          if (iterTask) {
            const effectiveState = getEffectiveTaskState(iterTask, resolvedChildIndex);
            const effectiveStateKF = taskStateToNodeState(effectiveState);
            const isTerminal =
              effectiveState === TaskStateKF.SUCCEEDED ||
              effectiveState === TaskStateKF.FAILED ||
              effectiveState === TaskStateKF.CACHED ||
              effectiveState === TaskStateKF.SKIPPED;

            iterStatus = {
              startTime: iterTask.create_time ?? '',
              completeTime: isTerminal ? iterTask.end_time : undefined,
              state: effectiveStateKF,
              taskId: `iteration.${i}`,
            };
            iterRunStatus = translateStatusForNode(effectiveStateKF);
          }

          const scopedTasks = iterTask ? tasksInScope(fullTasks, iterTask.task_id) : [];
          const executionIndex = mlmd?.allExecutions ?? mlmd?.executions;
          const iterationExecutionId =
            mlmd?.executions && executionIndex
              ? resolveIterationExecutionId(mlmd.executions, executionIndex, {
                  iterationTaskName: taskName,
                  iterationIndex: i,
                })
              : undefined;
          const iterationMlmd = mlmd
            ? {
                ...mlmd,
                allExecutions: executionIndex,
                executions: executionIndex
                  ? executionsForIterationScope(
                      mlmd.executions ?? [],
                      {
                        iterationTaskName: taskName,
                        iterationIndex: i,
                        iterationExecutionId,
                      },
                      executionIndex,
                    )
                  : [],
              }
            : mlmd;

          const iterLabel = `${taskName} #${i + 1}`;
          const iterPipelineTask: PipelineTask = {
            type: 'groupTask',
            name: iterLabel,
            status: iterStatus,
            isSubDag: false,
            iterationParentTaskId: iterTask?.task_id,
            iterationIndex: i,
            iterationTaskName: taskName,
            iterationExecutionId,
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
            runDetails,
            scopedTasks,
            component?.inputDefinitions?.artifacts,
            fullTasks,
            resolvedChildIndex,
            iterationMlmd,
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

        const nestedTasks = groupTask ? tasksInScope(fullTasks, groupTask.task_id) : [];
        const [nestedNodes, taskChildren] = getNodesForTasks(
          taskId,
          spec,
          subTasks,
          components,
          executors,
          componentArtifactMap,
          subTasksArtifactMap,
          runDetails,
          nestedTasks,
          component?.inputDefinitions?.artifacts,
          fullTasks,
          resolvedChildIndex,
          mlmd,
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
  runtimeTasks?: PipelineTaskKF[] | null,
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

    const componentArtifactMap = parseComponentsForArtifactRelationship(components);
    const taskArtifactMap = parseTasksForArtifactRelationship('root', tasks);
    const scopedTasks = runtimeTasks ? tasksInScope(runtimeTasks) : undefined;
    const topLevelChildIndex = runtimeTasks ? buildTaskChildrenIndex(runtimeTasks) : undefined;
    const mlmd: MlmdArtifactContext | undefined =
      executions || events || artifacts
        ? {
            executionLinkedArtifactMap: getExecutionLinkedArtifactMap(artifacts, events),
            events: parseEventsByType(events ?? [])[Event.Type.OUTPUT],
            artifacts,
            executions: executions ?? undefined,
            allExecutions: executions ?? undefined,
          }
        : undefined;

    return _.uniqBy(
      getNodesForTasks(
        'root',
        spec,
        tasks,
        components,
        executors,
        componentArtifactMap,
        taskArtifactMap,
        runDetails,
        scopedTasks,
        inputDefinitions?.artifacts,
        runtimeTasks,
        topLevelChildIndex,
        mlmd,
      )[0],
      (node) => node.id,
    );
  }, [artifacts, events, executions, runDetails, runtimeTasks, spec]);

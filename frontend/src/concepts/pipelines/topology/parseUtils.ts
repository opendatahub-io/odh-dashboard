import { RunStatus } from '@patternfly/react-topology';
import type { VolumeMount } from '@odh-dashboard/k8s-core';
import {
  ArtifactStateKF,
  DAG,
  ExecutionStateKF,
  InputOutputArtifactType,
  InputOutputDefinition,
  PipelineComponentsKF,
  PipelineTaskKF,
  PlatformSpec,
  RunDetailsKF,
  RuntimeStateKF,
  TaskDetailKF,
  TaskPodTypeKF,
  TaskStateKF,
  TaskTypeKF,
} from '#~/concepts/pipelines/kfTypes';
import { Artifact, Event, Execution } from '#~/third_party/mlmd';
import { LinkedArtifact } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { getArtifactNameFromEvent } from '#~/concepts/pipelines/content/compareRuns/metricsSection/utils';
import { PipelineTaskInputOutput, PipelineTaskRunStatus } from './pipelineTaskTypes';

export const composeArtifactType = (data: InputOutputArtifactType): string =>
  `${data.schemaTitle} (${data.schemaVersion})`;

export type ComponentArtifactMap = {
  [componentName: string]: { [artifactId: string]: InputOutputArtifactType } | undefined;
};
export const parseComponentsForArtifactRelationship = (
  components: PipelineComponentsKF,
): ComponentArtifactMap =>
  Object.entries(components).reduce<ComponentArtifactMap>(
    (map, [componentId, componentValue]) =>
      Object.entries(componentValue?.outputDefinitions?.artifacts ?? {}).reduce(
        (artifactItems, [artifactId, value]) => {
          const { artifactType } = value;

          return {
            ...artifactItems,
            [componentId]: {
              ...artifactItems[componentId],
              [artifactId]: artifactType,
            },
          };
        },
        map,
      ),
    {},
  );

export type TaskArtifactMap = {
  [taskName: string]: { artifactNodeId: string }[] | undefined;
};
export const parseTasksForArtifactRelationship = (
  groupId: string | undefined,
  tasks: DAG['tasks'],
): TaskArtifactMap =>
  Object.entries(tasks).reduce<TaskArtifactMap>(
    (map, [taskId, taskValue]) =>
      Object.entries(taskValue.inputs?.artifacts ?? {}).reduce((artifactItems, [, value]) => {
        // artifact without inputs
        if (value.componentInputArtifact) {
          return {
            ...artifactItems,
            [taskId]: [
              ...(artifactItems[taskId] ?? []),
              {
                artifactNodeId: idForTaskArtifact(groupId, '', value.componentInputArtifact),
              },
            ],
          };
        }

        // else, artifacts with inputs from tasks
        const { producerTask, outputArtifactKey } = value.taskOutputArtifact || {};

        if (!producerTask || !outputArtifactKey) {
          // eslint-disable-next-line no-console
          console.warn('Issue constructing artifact node', value);
          return artifactItems;
        }

        return {
          ...artifactItems,
          [taskId]: [
            ...(artifactItems[taskId] ?? []),
            {
              artifactNodeId: idForTaskArtifact(groupId, producerTask, outputArtifactKey),
            },
          ],
        };
      }, map),
    {},
  );

export function filterEventWithInputArtifact(linkedArtifact: LinkedArtifact[]): LinkedArtifact[] {
  return linkedArtifact.filter((obj) => obj.event.getType() === Event.Type.INPUT);
}

export function filterEventWithOutputArtifact(linkedArtifact: LinkedArtifact[]): LinkedArtifact[] {
  return linkedArtifact.filter((obj) => obj.event.getType() === Event.Type.OUTPUT);
}

export const parseInputOutput = (
  definition: InputOutputDefinition,
  linkedArtifacts: LinkedArtifact[],
): PipelineTaskInputOutput | undefined => {
  let data: PipelineTaskInputOutput | undefined;
  const { artifacts, parameters } = definition;
  data = {};

  if (parameters) {
    data = {
      ...data,
      params: Object.entries(parameters).map(([paramLabel, { parameterType }]) => ({
        label: paramLabel,
        type: parameterType,
        // TODO: support value
      })),
    };
  }

  if (artifacts) {
    data = {
      ...data,
      artifacts: Object.entries(artifacts).map(([paramLabel, { artifactType }]) => {
        const linkedArtifact = linkedArtifacts.find(
          (obj) => getArtifactNameFromEvent(obj.event) === paramLabel,
        );
        return {
          label: paramLabel,
          type: composeArtifactType(artifactType),
          value: linkedArtifact?.artifact,
        };
      }),
    };
  }

  return data;
};

export const lowestProgress = (details: TaskDetailKF[]): PipelineTaskRunStatus['state'] => {
  const statusWeight = (status?: RuntimeStateKF) => {
    switch (status) {
      case RuntimeStateKF.PENDING:
        return 10;
      case RuntimeStateKF.RUNNING:
        return 20;
      case RuntimeStateKF.SKIPPED:
        return 30;
      case RuntimeStateKF.PAUSED:
        return 40;
      case RuntimeStateKF.CANCELING:
        return 59;
      case RuntimeStateKF.CANCELED:
        return 51;
      case RuntimeStateKF.SUCCEEDED:
        return 60;
      case RuntimeStateKF.FAILED:
        return 70;
      case RuntimeStateKF.RUNTIME_STATE_UNSPECIFIED:
      default:
        return 0;
    }
  };

  return details.toSorted(
    ({ state: stateA }, { state: stateB }) => statusWeight(stateB) - statusWeight(stateA),
  )[0].state;
};

export const parseRuntimeInfoFromRunDetails = (
  taskId: string,
  runDetails?: RunDetailsKF,
): PipelineTaskRunStatus | undefined => {
  if (!runDetails) {
    return undefined;
  }
  const { task_details: taskDetails } = runDetails;
  // Optional while task_details is deprecated. Absent details yield no runtime info;
  // callers migrate to PipelineRunKF.tasks in a later ticket.
  if (!taskDetails) {
    return undefined;
  }

  // taskId should always be first, as it's the most direct item, but it may not drive the entire details
  const nameVariants = [taskId, `${taskId}-driver`];
  const thisTaskDetail = taskDetails.filter(({ display_name: name, execution_id: executionId }) =>
    nameVariants.includes(name ?? executionId ?? ''),
  );
  if (thisTaskDetail.length === 0) {
    // No details yet
    return undefined;
  }

  return {
    startTime: thisTaskDetail[0].start_time,
    completeTime: thisTaskDetail[0].end_time,
    state: lowestProgress(thisTaskDetail),
    taskId: `task.${taskId}`,
    podName: thisTaskDetail[0].child_tasks?.find((o) => o.pod_name)?.pod_name,
  };
};

/** protojson int64 fields arrive as decimal strings. Values past MAX_SAFE_INTEGER collapse to the cap. */
export const parseInt64Decimal = (value?: string): number | undefined => {
  if (value == null || !/^-?\d+$/.test(value)) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    return parsed > 0 ? Number.MAX_SAFE_INTEGER : undefined;
  }
  return parsed;
};

export const taskMatchesSpecName = (
  task: PipelineTaskKF,
  taskName: string,
  taskId: string,
): boolean => {
  const label = taskName || taskId;
  return task.display_name === label || task.name === label;
};

export const findTaskForSpec = (
  taskName: string,
  taskId: string,
  tasks?: PipelineTaskKF[] | null,
): PipelineTaskKF | undefined =>
  tasks?.find(
    (task) => task.type !== TaskTypeKF.ROOT && taskMatchesSpecName(task, taskName, taskId),
  );

const terminalTaskState = (state?: TaskStateKF): boolean =>
  state === TaskStateKF.SUCCEEDED ||
  state === TaskStateKF.FAILED ||
  state === TaskStateKF.CACHED ||
  state === TaskStateKF.SKIPPED;

/** Map a v2beta1 task state onto the node status union the graph already renders. */
export const taskStateToNodeState = (
  state?: TaskStateKF,
): ExecutionStateKF | RuntimeStateKF | undefined => {
  switch (state) {
    case TaskStateKF.SUCCEEDED:
    case TaskStateKF.CACHED:
      return ExecutionStateKF.COMPLETE;
    case TaskStateKF.FAILED:
      return ExecutionStateKF.FAILED;
    case TaskStateKF.SKIPPED:
      return RuntimeStateKF.SKIPPED;
    case TaskStateKF.RUNNING:
      return ExecutionStateKF.RUNNING;
    case TaskStateKF.RUNTIME_STATE_UNSPECIFIED:
    default:
      return undefined;
  }
};

const executorPodName = (task: PipelineTaskKF): string | undefined =>
  task.pods?.find((pod) => pod.type === TaskPodTypeKF.EXECUTOR)?.name ?? task.pods?.[0]?.name;

export const parseRuntimeInfoFromTasks = (
  taskId: string,
  taskName: string,
  tasks?: PipelineTaskKF[] | null,
): PipelineTaskRunStatus | undefined => {
  const task = findTaskForSpec(taskName, taskId, tasks);
  if (!task) {
    return undefined;
  }

  return {
    startTime: task.create_time ?? '',
    completeTime: terminalTaskState(task.state) ? task.end_time : undefined,
    state: taskStateToNodeState(task.state),
    taskId: `task.${taskId}`,
    podName: executorPodName(task),
  };
};

export enum ResourceType {
  ARTIFACT = 'ARTIFACT',
  EXECUTION = 'EXECUTION',
}

export interface ArtifactProps {
  resourceType: ResourceType.ARTIFACT;
  resource: Artifact;
}

export interface ExecutionProps {
  resourceType: ResourceType.EXECUTION;
  resource: Execution;
}

export type ResourceInfoProps = ArtifactProps | ExecutionProps;

// Get text representation of resource state.
// Works for both artifact and execution.
export const getResourceStateText = (
  props: ResourceInfoProps,
): ArtifactStateKF | ExecutionStateKF | undefined => {
  if (props.resourceType === ResourceType.ARTIFACT) {
    const state = props.resource.getState();
    switch (state) {
      case Artifact.State.PENDING:
        return ArtifactStateKF.PENDING;
      case Artifact.State.LIVE:
        return ArtifactStateKF.LIVE;
      case Artifact.State.MARKED_FOR_DELETION:
        return ArtifactStateKF.MARKED_FOR_DELETION;
      case Artifact.State.DELETED:
        return ArtifactStateKF.DELETED;
      default:
        return undefined;
    }
  } else {
    // type == EXECUTION
    const state = props.resource.getLastKnownState();
    switch (state) {
      case Execution.State.NEW:
        return ExecutionStateKF.NEW;
      case Execution.State.RUNNING:
        return ExecutionStateKF.RUNNING;
      case Execution.State.COMPLETE:
        return ExecutionStateKF.COMPLETE;
      case Execution.State.CANCELED:
        return ExecutionStateKF.CANCELED;
      case Execution.State.FAILED:
        return ExecutionStateKF.FAILED;
      case Execution.State.CACHED:
        return ExecutionStateKF.CACHED;
      default:
        return undefined;
    }
  }
};

export const translateStatusForNode = (
  state?: RuntimeStateKF | ExecutionStateKF | ArtifactStateKF,
): RunStatus | undefined => {
  switch (state) {
    case ExecutionStateKF.CANCELED:
    case RuntimeStateKF.CANCELED:
    case RuntimeStateKF.CANCELING:
      return RunStatus.Cancelled;
    case ExecutionStateKF.RUNNING:
      return RunStatus.Running;
    case ExecutionStateKF.FAILED:
    case RuntimeStateKF.FAILED:
      return RunStatus.Failed;
    case ArtifactStateKF.PENDING:
    case RuntimeStateKF.PAUSED:
    case RuntimeStateKF.PENDING:
      return RunStatus.Pending;
    case RuntimeStateKF.RUNNING:
      return RunStatus.InProgress;
    case ExecutionStateKF.COMPLETE:
    case RuntimeStateKF.SUCCEEDED:
      return RunStatus.Succeeded;
    case ExecutionStateKF.CACHED:
    case RuntimeStateKF.SKIPPED:
      return RunStatus.Skipped;
    case RuntimeStateKF.RUNTIME_STATE_UNSPECIFIED:
    default:
      return undefined;
  }
};

/**
 * ParallelFor group for a spec task. `iteration_count` is a decimal string on type LOOP.
 */
export const findParallelForTask = (
  taskName: string,
  taskId: string,
  tasks?: PipelineTaskKF[] | null,
): PipelineTaskKF | undefined => {
  const matches =
    tasks?.filter(
      (task) => task.type !== TaskTypeKF.ROOT && taskMatchesSpecName(task, taskName, taskId),
    ) ?? [];
  return (
    matches.find((task) => task.type === TaskTypeKF.LOOP) ??
    matches.find((task) => task.type_attributes?.iteration_count != null)
  );
};

/** Parse `type_attributes.iteration_count`. Undefined when the field is absent or not a decimal string. */
export const getIterationCount = (task: PipelineTaskKF): number | undefined =>
  parseInt64Decimal(task.type_attributes?.iteration_count);

const isChildTask = (
  task: PipelineTaskKF,
  parentTaskId: string,
  parent?: PipelineTaskKF,
): boolean =>
  task.parent_task_id === parentTaskId ||
  (parent?.child_tasks?.some((child) => child.task_id === task.task_id) ?? false);

/**
 * Iteration under a ParallelFor parent.
 * `iteration_index` is a decimal string. Parentage is `parent_task_id` or `child_tasks`.
 */
export const findIterationTask = (
  parentTaskId: string,
  iterationIndex: number,
  tasks: PipelineTaskKF[],
): PipelineTaskKF | undefined => {
  const parent = tasks.find((task) => task.task_id === parentTaskId);
  return tasks.find(
    (task) =>
      parseInt64Decimal(task.type_attributes?.iteration_index) === iterationIndex &&
      isChildTask(task, parentTaskId, parent),
  );
};

/** Direct children of a parent. No parent id means the tasks under ROOT, or tasks with no parent. */
export const tasksInScope = (tasks: PipelineTaskKF[], parentTaskId?: string): PipelineTaskKF[] => {
  if (!parentTaskId) {
    const root = tasks.find((task) => task.type === TaskTypeKF.ROOT);
    if (!root) {
      return tasks.filter((task) => !task.parent_task_id && task.type !== TaskTypeKF.ROOT);
    }
    const childIds = new Set(root.child_tasks?.map((child) => child.task_id));
    return tasks.filter(
      (task) => task.parent_task_id === root.task_id || childIds.has(task.task_id),
    );
  }

  const parent = tasks.find((task) => task.task_id === parentTaskId);
  const childIds = new Set(parent?.child_tasks?.map((child) => child.task_id));
  return tasks.filter((task) => task.parent_task_id === parentTaskId || childIds.has(task.task_id));
};

/** Every task under a parent, following `parent_task_id` and `child_tasks`. */
export const descendantTasks = (
  parentTaskId: string,
  childrenIndex: Map<string, PipelineTaskKF[]>,
): PipelineTaskKF[] => {
  const result: PipelineTaskKF[] = [];
  const walk = (id: string) => {
    (childrenIndex.get(id) ?? []).forEach((child) => {
      result.push(child);
      walk(child.task_id);
    });
  };
  walk(parentTaskId);
  return result;
};

export const parseVolumeMounts = (
  platformSpec?: PlatformSpec,
  executorLabel?: string,
): VolumeMount[] => {
  if (
    !platformSpec ||
    !platformSpec.platforms.kubernetes ||
    !platformSpec.platforms.kubernetes.deploymentSpec ||
    !platformSpec.platforms.kubernetes.deploymentSpec.executors ||
    !executorLabel
  ) {
    return [];
  }

  const executor = platformSpec.platforms.kubernetes.deploymentSpec.executors[executorLabel];

  if (!executor || !executor.pvcMount) {
    return [];
  }
  return executor.pvcMount.map((pvc) => ({
    mountPath: pvc.mountPath,
    name: pvc.taskOutputParameter?.producerTask ?? pvc.constant ?? '',
  }));
};

export const idForTaskArtifact = (
  groupId: string | undefined,
  taskId: string,
  artifactId: string,
): string =>
  groupId
    ? `GROUP.${groupId}.ARTIFACT.${taskId}.${artifactId}`
    : `ARTIFACT.${taskId}.${artifactId}`;

export const getExecutionLinkedArtifactMap = (
  artifacts?: Artifact[] | null,
  events?: Event[] | null,
): Record<number, LinkedArtifact[]> => {
  if (!artifacts || !events) {
    return {};
  }
  const executionMap: Record<number, LinkedArtifact[]> = {};

  const artifactMap: Record<number, Artifact> = {};
  artifacts.forEach((artifact) => {
    artifactMap[artifact.getId()] = artifact;
  });

  events.forEach((event) => {
    const artifact = artifactMap[event.getArtifactId()];
    const executionId = event.getExecutionId();

    if (!(executionId in executionMap)) {
      executionMap[executionId] = [];
    }

    executionMap[executionId].push({ event, artifact });
  });

  return executionMap;
};

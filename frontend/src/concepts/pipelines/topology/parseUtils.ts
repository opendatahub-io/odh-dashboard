import { RunStatus } from '@patternfly/react-topology';
import {
  ArtifactStateKF,
  DAG,
  ExecutionStateKF,
  InputOutputArtifactType,
  InputOutputDefinition,
  PipelineComponentsKF,
  PlatformSpec,
  RunDetailsKF,
  RuntimeStateKF,
  TaskDetailKF,
} from '#~/concepts/pipelines/kfTypes';
import { VolumeMount } from '#~/types';
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

export const parseRuntimeInfoFromExecutions = (
  taskId: string,
  taskName: string,
  executions?: Execution[] | null,
): PipelineTaskRunStatus | undefined => {
  if (!executions) {
    return undefined;
  }

  const execution = executions.find(
    (e) => e.getCustomPropertiesMap().get('task_name')?.getStringValue() === (taskName || taskId),
  );

  if (!execution) {
    return undefined;
  }

  const lastUpdatedTime = execution.getLastUpdateTimeSinceEpoch();
  let completeTime;
  const lastKnownState = execution.getLastKnownState();
  // Logic comes from https://github.com/opendatahub-io/data-science-pipelines/blob/master/frontend/src/components/tabs/RuntimeNodeDetailsV2.tsx#L245-L253
  if (
    lastUpdatedTime &&
    (lastKnownState === Execution.State.COMPLETE ||
      lastKnownState === Execution.State.FAILED ||
      lastKnownState === Execution.State.CACHED ||
      lastKnownState === Execution.State.CANCELED)
  ) {
    completeTime = new Date(lastUpdatedTime).toISOString();
  }
  return {
    startTime: new Date(execution.getCreateTimeSinceEpoch()).toISOString(),
    completeTime,
    state: getResourceStateText({
      resourceType: ResourceType.EXECUTION,
      resource: execution,
    }),
    taskId: `task.${taskId}`,
    podName: execution.getCustomPropertiesMap().get('pod_name')?.getStringValue(),
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

export const parseVolumeMounts = (
  platformSpec?: PlatformSpec,
  executorLabel?: string,
): VolumeMount[] => {
  if (!platformSpec || !platformSpec.platforms.kubernetes || !executorLabel) {
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

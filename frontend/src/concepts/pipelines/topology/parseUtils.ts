import { RunStatus } from '@patternfly/react-topology';
import {
  DAG,
  InputOutputArtifactType,
  InputOutputDefinition,
  PipelineComponentsKF,
  RunDetailsKF,
  RuntimeStateKF,
  TaskDetailKF,
} from '~/concepts/pipelines/kfTypes';
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
  [taskName: string]: { outputArtifactKey: string; artifactId: string }[] | undefined;
};
export const parseTasksForArtifactRelationship = (tasks: DAG['tasks']): TaskArtifactMap =>
  Object.values(tasks).reduce<TaskArtifactMap>(
    (map, taskValue) =>
      Object.entries(taskValue.inputs?.artifacts ?? {}).reduce(
        (artifactItems, [artifactId, value]) => {
          const { producerTask: taskId, outputArtifactKey } = value.taskOutputArtifact || {};
          if (!taskId || !outputArtifactKey) {
            // eslint-disable-next-line no-console
            console.warn('Issue constructing artifact node', value);
            return artifactItems;
          }

          return {
            ...artifactItems,
            [taskId]: [
              ...(artifactItems[taskId] ?? []),
              {
                outputArtifactKey,
                artifactId,
              },
            ],
          };
        },
        map,
      ),
    {},
  );

export const parseInputOutput = (
  definition?: InputOutputDefinition,
): PipelineTaskInputOutput | undefined => {
  let data: PipelineTaskInputOutput | undefined;
  if (definition) {
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
        artifacts: Object.entries(artifacts).map(([paramLabel, { artifactType }]) => ({
          label: paramLabel,
          type: composeArtifactType(artifactType),
          // TODO: support value
        })),
      };
    }
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

  return details.sort(
    ({ state: stateA }, { state: stateB }) => statusWeight(stateB) - statusWeight(stateA),
  )[0].state;
};

export const parseRuntimeInfo = (
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
    taskId: thisTaskDetail[0].task_id,
    podName: thisTaskDetail[0].child_tasks?.find((o) => o.pod_name)?.pod_name,
  };
};

export const translateStatusForNode = (stateKF?: RuntimeStateKF): RunStatus | undefined => {
  switch (stateKF) {
    case RuntimeStateKF.CANCELED:
    case RuntimeStateKF.CANCELING:
      return RunStatus.Cancelled;
    case RuntimeStateKF.PAUSED:
      return RunStatus.Pending;
    case RuntimeStateKF.FAILED:
      return RunStatus.Failed;
    case RuntimeStateKF.PENDING:
      return RunStatus.Pending;
    case RuntimeStateKF.RUNNING:
      return RunStatus.InProgress;
    case RuntimeStateKF.SUCCEEDED:
      return RunStatus.Succeeded;
    case RuntimeStateKF.SKIPPED:
      return RunStatus.Skipped;
    case RuntimeStateKF.RUNTIME_STATE_UNSPECIFIED:
    default:
      return undefined;
  }
};

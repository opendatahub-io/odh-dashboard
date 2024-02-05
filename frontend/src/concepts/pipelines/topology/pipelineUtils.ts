import { RunStatus } from '@patternfly/react-topology';
import {
  PipelineRunTaskParam,
  PipelineRunTaskRunStatusProperties,
  PipelineRunTaskWhen,
} from '~/k8sTypes';
import { PipelineRunTaskDetails } from '~/concepts/pipelines/content/types';

export const getParamName = (param: string): string | null => {
  const paramValueMatch = param.match(/^\$\((params\.([a-zA-Z0-9-_]+))\)/);
  if (!paramValueMatch) {
    return null;
  }
  return paramValueMatch[1].split('.')[1];
};

export const getNameAndPathFromTaskRef = (taskRef: string): [string, string] | null => {
  const match = taskRef.match(/\$\(tasks\.([a-z0-9-]+)\.(.+)\)/);
  if (!match) {
    return null;
  }

  return [match[1], match[2]];
};

export const getNameFromTaskRef = (taskRef: string): string | null =>
  getNameAndPathFromTaskRef(taskRef)?.[0] ?? null;

type AsRunAfter<T> = (item: T) => string | null;

export const paramAsRunAfter: AsRunAfter<PipelineRunTaskParam> = (param) => {
  if (param.value) {
    return getNameFromTaskRef(param.value);
  }
  return null;
};
export const whenAsRunAfter: AsRunAfter<PipelineRunTaskWhen> = (when) => {
  if (when.input) {
    return getNameFromTaskRef(when.input);
  }
  return null;
};

export const getRunStatus = (status?: PipelineRunTaskRunStatusProperties): RunStatus => {
  const successCondition = status?.conditions?.find((s) => s.type === 'Succeeded');
  // const cancelledCondition = status.conditions.find((s) => s.status === 'Cancelled');

  if (!successCondition || !successCondition.status) {
    return RunStatus.Idle;
  }

  let runStatus: RunStatus | undefined;
  if (successCondition.status === 'True') {
    runStatus = RunStatus.Succeeded;
  } else if (successCondition.status === 'False') {
    runStatus = RunStatus.Failed;
  } else {
    runStatus = RunStatus.Running;
  }

  return runStatus;
};

export const getValue = (task: PipelineRunTaskDetails, path: string): string | null => {
  const parts = path.split('.');
  if (!task.runDetails) {
    return null;
  }

  if (parts[0] === 'results' && parts[1]) {
    const name = parts[1];
    return (
      task.runDetails.status?.taskResults?.find((result) => result.name === name)?.value ?? null
    );
  }

  return null;
};

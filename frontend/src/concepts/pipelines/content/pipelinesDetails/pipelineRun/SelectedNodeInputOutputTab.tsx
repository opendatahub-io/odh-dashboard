import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { PipelineRunTaskDetails, TaskReferenceMap } from '~/concepts/pipelines/content/types';
import { getNameAndPathFromTaskRef, getValue } from '~/concepts/pipelines/topology/pipelineUtils';
import TaskDetailsInputParams from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsInputParams';
import TaskDetailsOutputResults from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsOutputResults';
import { PipelineRunTaskParam } from '~/k8sTypes';

type SelectedNodeInputOutputTabProps = {
  task: PipelineRunTaskDetails;
  taskReferences: TaskReferenceMap;
  parameter?: PipelineRunTaskParam[];
};

const SelectedNodeInputOutputTab: React.FC<SelectedNodeInputOutputTabProps> = ({
  task,
  taskReferences,
  parameter,
}) => {
  const params =
    task.params?.map((p) => {
      const paramValueMatch = p.value.match(/^\$\((params\.([a-zA-Z0-9-_]+))\)/);
      if (paramValueMatch && parameter) {
        const paramName = paramValueMatch[1].split('.')[1];
        const paramFromParameter =
          parameter.find((result) => result.name === paramName)?.value ?? p.value;
        return { ...p, value: paramFromParameter };
      }
      const ref = getNameAndPathFromTaskRef(p.value);
      if (!ref) {
        return p;
      }
      const [name, path] = ref;

      const refTask = taskReferences[name];
      const value = getValue(refTask, path) ?? p.value;
      return { ...p, value: value };
    }) ?? [];

  const results = task.runDetails?.status.taskResults ?? [];

  if (params.length === 0 && results.length === 0) {
    return <>No content</>;
  }

  return (
    <Stack hasGutter>
      {params.length > 0 && (
        <StackItem>
          <TaskDetailsInputParams params={params} />
        </StackItem>
      )}
      {results.length > 0 && (
        <StackItem>
          <TaskDetailsOutputResults results={results} />
        </StackItem>
      )}
    </Stack>
  );
};

export default SelectedNodeInputOutputTab;

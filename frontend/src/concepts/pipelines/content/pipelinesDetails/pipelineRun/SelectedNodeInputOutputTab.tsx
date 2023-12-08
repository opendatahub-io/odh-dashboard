import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { PipelineRunTaskDetails, TaskReferenceMap } from '~/concepts/pipelines/content/types';
import { getNameAndPathFromTaskRef, getValue } from '~/concepts/pipelines/topology/pipelineUtils';
import TaskDetailsInputParams from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsInputParams';
import TaskDetailsOutputResults from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsOutputResults';

type SelectedNodeInputOutputTabProps = {
  task: PipelineRunTaskDetails;
  taskReferences: TaskReferenceMap;
};

const SelectedNodeInputOutputTab: React.FC<SelectedNodeInputOutputTabProps> = ({
  task,
  taskReferences,
}) => {
  const params =
    task.params?.map((p) => {
      const ref = getNameAndPathFromTaskRef(p.value);
      if (!ref) {
        return p;
      }
      const [name, path] = ref;
      const refTask = taskReferences[name];
      const value = getValue(refTask, path) ?? p.value;
      return { ...p, value };
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

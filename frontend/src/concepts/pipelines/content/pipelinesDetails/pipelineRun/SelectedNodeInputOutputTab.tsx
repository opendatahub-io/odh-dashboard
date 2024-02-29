import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import TaskDetailsInputOutput from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsInputOutput';
import { PipelineTask } from '~/concepts/pipelines/topology';

type SelectedNodeInputOutputTabProps = {
  task: PipelineTask;
};

const SelectedNodeInputOutputTab: React.FC<SelectedNodeInputOutputTabProps> = ({ task }) => {
  if (!task.inputs && !task.outputs) {
    return <>No content</>;
  }

  return (
    <Stack hasGutter>
      {task.inputs && (
        <StackItem>
          <TaskDetailsInputOutput
            type="Input"
            artifacts={task.inputs.artifacts?.map((a) => ({ label: a.label, value: a.type }))}
            params={task.inputs.params?.map((p) => ({ label: p.label, value: p.value ?? p.type }))}
          />
        </StackItem>
      )}
      {task.outputs && (
        <StackItem>
          <TaskDetailsInputOutput
            type="Output"
            artifacts={task.outputs.artifacts?.map((a) => ({ label: a.label, value: a.type }))}
            params={task.outputs.params?.map((p) => ({ label: p.label, value: p.value ?? p.type }))}
          />
        </StackItem>
      )}
    </Stack>
  );
};
export default SelectedNodeInputOutputTab;

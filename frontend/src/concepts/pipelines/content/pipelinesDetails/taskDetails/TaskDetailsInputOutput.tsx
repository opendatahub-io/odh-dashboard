import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import TaskDetailsSection from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsSection';
import TaskDetailsPrintKeyValues from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsPrintKeyValues';

type TaskDetailsInputOutputProps = {
  type: 'Input' | 'Output';
  artifacts?: React.ComponentProps<typeof TaskDetailsPrintKeyValues>['items'];
  params?: React.ComponentProps<typeof TaskDetailsPrintKeyValues>['items'];
};

const TaskDetailsInputOutput: React.FC<TaskDetailsInputOutputProps> = ({
  artifacts,
  params,
  type,
}) => {
  if (!params && !artifacts) {
    return null;
  }

  return (
    <Stack hasGutter>
      {artifacts && (
        <StackItem>
          <TaskDetailsSection title={`${type} artifacts`} testId={`${type}-artifacts`}>
            <TaskDetailsPrintKeyValues items={artifacts} />
          </TaskDetailsSection>
        </StackItem>
      )}
      {params && (
        <StackItem>
          <TaskDetailsSection title={`${type} parameters`} testId={`${type}-parameters`}>
            <TaskDetailsPrintKeyValues items={params} />
          </TaskDetailsSection>
        </StackItem>
      )}
    </Stack>
  );
};

export default TaskDetailsInputOutput;

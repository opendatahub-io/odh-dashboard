import * as React from 'react';
import { Flex, FlexItem, Stack, StackItem } from '@patternfly/react-core';
import TaskDetailsSection from '#~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsSection';
import TaskDetailsCodeBlock from '#~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsCodeBlock';
import TaskDetailsInputOutput from '#~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsInputOutput';
import { PipelineTask } from '#~/concepts/pipelines/topology';

type TaskDetailsProps = {
  task: PipelineTask;
};

const PipelineTaskDetails: React.FC<TaskDetailsProps> = ({ task }) => {
  if (!task.inputs && !task.outputs && !task.steps) {
    return (
      <Stack hasGutter>
        <StackItem>No content</StackItem>
      </Stack>
    );
  }

  return (
    <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsXl' }}>
      {task.inputs && (
        <FlexItem>
          <TaskDetailsInputOutput
            type="Input"
            artifacts={task.inputs.artifacts}
            params={task.inputs.params?.map((p) => ({ label: p.label, value: p.value ?? p.type }))}
          />
        </FlexItem>
      )}
      {task.outputs && (
        <FlexItem>
          <TaskDetailsInputOutput
            type="Output"
            artifacts={task.outputs.artifacts}
            params={task.outputs.params?.map((p) => ({ label: p.label, value: p.value ?? p.type }))}
          />
        </FlexItem>
      )}
      {task.steps?.map((step, i) => (
        <React.Fragment key={i}>
          <FlexItem>
            <TaskDetailsSection testId="task-detail-image" title="Image">
              {step.image}
            </TaskDetailsSection>
          </FlexItem>
          {step.command && (
            <FlexItem>
              <TaskDetailsSection title="Command">
                <TaskDetailsCodeBlock
                  id="command"
                  testId="command-task-detail-code-block"
                  content={step.command.join('\n')}
                />
              </TaskDetailsSection>
            </FlexItem>
          )}
          {step.args && (
            <FlexItem>
              <TaskDetailsSection title="Arguments">
                <TaskDetailsCodeBlock
                  id="args"
                  testId="arguments-task-detail-code-block"
                  content={step.args.join('\n')}
                />
              </TaskDetailsSection>
            </FlexItem>
          )}
        </React.Fragment>
      ))}
      <FlexItem>&nbsp;</FlexItem>
    </Flex>
  );
};

export default PipelineTaskDetails;

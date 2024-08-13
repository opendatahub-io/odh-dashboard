import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import TaskDetailsSection from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsSection';
import TaskDetailsCodeBlock from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsCodeBlock';
import TaskDetailsInputOutput from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsInputOutput';
import { PipelineTask } from '~/concepts/pipelines/topology';

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
    <Stack hasGutter>
      {task.inputs && (
        <StackItem>
          <TaskDetailsInputOutput
            type="Input"
            artifacts={task.inputs.artifacts}
            params={task.inputs.params?.map((p) => ({ label: p.label, value: p.value ?? p.type }))}
          />
        </StackItem>
      )}
      {task.outputs && (
        <StackItem>
          <TaskDetailsInputOutput
            type="Output"
            artifacts={task.outputs.artifacts}
            params={task.outputs.params?.map((p) => ({ label: p.label, value: p.value ?? p.type }))}
          />
        </StackItem>
      )}
      {task.steps?.map((step, i) => (
        <React.Fragment key={i}>
          <StackItem>
            <TaskDetailsSection testId="task-detail-image" title="Image">
              {step.image}
            </TaskDetailsSection>
          </StackItem>
          {step.command && (
            <StackItem>
              <TaskDetailsSection title="Command">
                <TaskDetailsCodeBlock
                  id="command"
                  testId="command-task-detail-code-block"
                  content={step.command.join('\n')}
                />
              </TaskDetailsSection>
            </StackItem>
          )}
          {step.args && (
            <StackItem>
              <TaskDetailsSection title="Arguments">
                <TaskDetailsCodeBlock
                  id="args"
                  testId="arguments-task-detail-code-block"
                  content={step.args.join('\n')}
                />
              </TaskDetailsSection>
            </StackItem>
          )}
        </React.Fragment>
      ))}
      <StackItem>&nbsp;</StackItem>
    </Stack>
  );
};

export default PipelineTaskDetails;

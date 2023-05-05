import * as React from 'react';
import { Stack, StackItem, Title } from '@patternfly/react-core';
import { Divider } from '@patternfly/react-core/components';
import { PipelineRunTask } from '~/k8sTypes';
import TaskDetailsSection from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsSection';
import TaskDetailsCodeBlock from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsCodeBlock';
import TaskDetailsInputParams from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsInputParams';
import TaskDetailsOutputResults from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsOutputResults';
import TaskDetailsVolumeMounts from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsVolumeMounts';

type TaskDetailsProps = {
  task: PipelineRunTask;
};

const PipelineTaskDetails: React.FC<TaskDetailsProps> = ({ task }) => (
  <Stack hasGutter>
    {task.params && (
      <StackItem>
        <TaskDetailsInputParams params={task.params} />
      </StackItem>
    )}
    {task.taskSpec.results && (
      <StackItem>
        <TaskDetailsOutputResults
          results={task.taskSpec.results.map(({ name, description }) => ({
            name,
            value: description ?? '',
          }))}
        />
      </StackItem>
    )}
    {task.taskSpec.steps.map((step) => (
      <React.Fragment key={step.name}>
        {task.taskSpec.steps.length > 1 && (
          <StackItem>
            <Title headingLevel="h3" size="lg">
              Step {step.name}
            </Title>
            <Divider />
          </StackItem>
        )}
        {step.args && (
          <StackItem>
            <TaskDetailsSection title="Arguments">
              <TaskDetailsCodeBlock id="args" content={step.args.join('\n')} />
            </TaskDetailsSection>
          </StackItem>
        )}
        {step.command && (
          <StackItem>
            <TaskDetailsSection title="Command">
              <TaskDetailsCodeBlock id="command" content={step.command.join('\n')} />
            </TaskDetailsSection>
          </StackItem>
        )}
        {step.image && (
          <StackItem>
            <TaskDetailsSection title="Image">{step.image}</TaskDetailsSection>
          </StackItem>
        )}
      </React.Fragment>
    ))}
    {task.taskSpec.stepTemplate?.volumeMounts && (
      <StackItem>
        <TaskDetailsVolumeMounts volumeMounts={task.taskSpec.stepTemplate.volumeMounts} />
      </StackItem>
    )}
    <StackItem>&nbsp;</StackItem>
  </Stack>
);

export default PipelineTaskDetails;

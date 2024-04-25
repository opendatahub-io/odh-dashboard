import * as React from 'react';
import { Alert, Stack, StackItem } from '@patternfly/react-core';
import TaskDetailsSection from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsSection';
import TaskDetailsCodeBlock from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsCodeBlock';
import TaskDetailsInputOutput from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsInputOutput';
import { PipelineTask } from '~/concepts/pipelines/topology';

type TaskDetailsProps = {
  task: PipelineTask;
};

const PipelineTaskDetails: React.FC<TaskDetailsProps> = ({ task }) => {
  let groupAlert: React.ReactNode | null = null;
  if (task.type === 'groupTask') {
    // TODO: remove when we support group details
    groupAlert = <Alert isInline variant="info" title="Content may be missing" />;
  }

  if (!task.inputs && !task.outputs && !task.steps) {
    return (
      <Stack hasGutter>
        {groupAlert && <StackItem>{groupAlert}</StackItem>}
        <StackItem>No content</StackItem>
      </Stack>
    );
  }

  return (
    <Stack hasGutter>
      {groupAlert && <StackItem>{groupAlert}</StackItem>}
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

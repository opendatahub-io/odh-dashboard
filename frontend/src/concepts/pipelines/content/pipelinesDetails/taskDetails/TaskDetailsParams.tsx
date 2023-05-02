import * as React from 'react';
import { Grid, GridItem, StackItem } from '@patternfly/react-core';
import TaskDetailsSection from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsSection';
import { PipelineRunTaskParam } from '~/k8sTypes';

type TaskDetailsParamsProps = {
  params: PipelineRunTaskParam[];
};

const TaskDetailsParams: React.FC<TaskDetailsParamsProps> = ({ params }) => (
  <StackItem>
    <TaskDetailsSection title="Input parameters">
      <Grid hasGutter>
        {params.map((param, i) => (
          <React.Fragment key={`param-${i}`}>
            <GridItem span={4}>{param.name}</GridItem>
            <GridItem span={8}>{param.value}</GridItem>
          </React.Fragment>
        ))}
      </Grid>
    </TaskDetailsSection>
  </StackItem>
);

export default TaskDetailsParams;

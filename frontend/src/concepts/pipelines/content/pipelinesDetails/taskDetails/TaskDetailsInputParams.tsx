import * as React from 'react';
import TaskDetailsSection from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsSection';
import { PipelineRunTaskParam } from '~/k8sTypes';
import TaskDetailsPrintKeyValues from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsPrintKeyValues';

type TaskDetailsInputParamsProps = {
  params: PipelineRunTaskParam[];
};

const TaskDetailsInputParams: React.FC<TaskDetailsInputParamsProps> = ({ params }) => (
  <TaskDetailsSection title="Input parameters">
    <TaskDetailsPrintKeyValues items={params} />
  </TaskDetailsSection>
);

export default TaskDetailsInputParams;

import * as React from 'react';
import TaskDetailsSection from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsSection';
import TaskDetailsPrintKeyValues from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsPrintKeyValues';

type TaskDetailsOutputResultsProps = {
  results: { name: string; value: string }[];
};

const TaskDetailsOutputResults: React.FC<TaskDetailsOutputResultsProps> = ({ results }) => (
  <TaskDetailsSection title="Output parameters">
    <TaskDetailsPrintKeyValues items={results} />
  </TaskDetailsSection>
);

export default TaskDetailsOutputResults;

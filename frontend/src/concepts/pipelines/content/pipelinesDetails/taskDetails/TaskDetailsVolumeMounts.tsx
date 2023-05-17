import * as React from 'react';
import TaskDetailsSection from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsSection';
import { PipelineRunTaskVolumeMount } from '~/k8sTypes';
import { renderDetailItems } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';

type TaskDetailsVolumeMountsProps = {
  volumeMounts: PipelineRunTaskVolumeMount[];
};

const TaskDetailsVolumeMounts: React.FC<TaskDetailsVolumeMountsProps> = ({ volumeMounts }) => (
  <TaskDetailsSection title="Volume mounts">
    {renderDetailItems(
      volumeMounts.map(({ name, mountPath }) => ({ key: mountPath, value: name })),
      true,
    )}
  </TaskDetailsSection>
);

export default TaskDetailsVolumeMounts;

import * as React from 'react';
import { PipelineTask } from '~/concepts/pipelines/topology';
import { renderDetailItems } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';

type SelectedNodeVolumeMountsTabProps = {
  task: PipelineTask;
};

const SelectedNodeVolumeMountsTab: React.FC<SelectedNodeVolumeMountsTabProps> = ({ task }) => {
  if (!task.volumeMounts || task.volumeMounts.length === 0) {
    return <>No content</>;
  }

  return (
    <>
      {renderDetailItems(
        task.volumeMounts.map(({ name, mountPath }) => ({ key: mountPath, value: name })),
      )}
    </>
  );
};
export default SelectedNodeVolumeMountsTab;

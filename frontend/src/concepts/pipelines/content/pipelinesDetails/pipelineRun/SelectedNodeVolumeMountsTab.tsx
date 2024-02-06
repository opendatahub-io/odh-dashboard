import * as React from 'react';
import { PipelineRunTaskDetails } from '~/concepts/pipelines/content/types';
import { PipelineRunTaskVolumeMount } from '~/k8sTypes';
import { renderDetailItems } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';

type SelectedNodeVolumeMountsTabProps = {
  task: PipelineRunTaskDetails;
};

const SelectedNodeVolumeMountsTab: React.FC<SelectedNodeVolumeMountsTabProps> = ({ task }) => {
  const items =
    task.runDetails?.status?.taskSpec?.steps?.reduce<Record<string, PipelineRunTaskVolumeMount>>(
      (acc, step) => {
        step.volumeMounts?.forEach((mountPath) => {
          acc[mountPath.name] = mountPath;
        });

        return acc;
      },
      {},
    ) ?? null;

  if (!items || Object.keys(items).length === 0) {
    return <>No content</>;
  }

  return (
    <>
      {renderDetailItems(
        Object.values(items).map(({ name, mountPath }) => ({ key: mountPath, value: name })),
        true,
      )}
    </>
  );
};

export default SelectedNodeVolumeMountsTab;

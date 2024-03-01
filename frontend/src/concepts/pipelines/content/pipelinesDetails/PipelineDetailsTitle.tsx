import React from 'react';
import { Label, Split, SplitItem } from '@patternfly/react-core';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import { computeRunStatus } from '~/concepts/pipelines/content/utils';
import PipelineRunTypeLabel from '~/concepts/pipelines/content/PipelineRunTypeLabel';

type RunJobTitleProps = {
  run: PipelineRunKF;
  statusIcon?: boolean;
  pipelineRunLabel?: boolean;
};

const PipelineDetailsTitle: React.FC<RunJobTitleProps> = ({
  run,
  statusIcon,
  pipelineRunLabel,
}) => {
  const { icon, label } = computeRunStatus(run);

  return (
    <Split hasGutter>
      <SplitItem>{run.name}</SplitItem>
      {pipelineRunLabel && (
        <SplitItem>
          <PipelineRunTypeLabel resource={run} />
        </SplitItem>
      )}
      {statusIcon && (
        <SplitItem>
          <Label icon={icon}>{label}</Label>
        </SplitItem>
      )}
    </Split>
  );
};
export default PipelineDetailsTitle;

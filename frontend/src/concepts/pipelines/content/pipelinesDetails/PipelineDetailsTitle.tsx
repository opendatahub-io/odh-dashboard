import React from 'react';
import { Label, Split, SplitItem } from '@patternfly/react-core';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { computeRunStatus } from '~/concepts/pipelines/content/utils';
import PipelineRunTypeLabel from '~/concepts/pipelines/content/PipelineRunTypeLabel';

type RunJobTitleProps = {
  run: PipelineRunKFv2;
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
    <>
      <Split hasGutter>
        <SplitItem>{run.display_name}</SplitItem>
        {pipelineRunLabel && (
          <SplitItem>
            <PipelineRunTypeLabel run={run} />
          </SplitItem>
        )}
        {statusIcon && (
          <SplitItem>
            <Label icon={icon}>{label}</Label>
          </SplitItem>
        )}
      </Split>
    </>
  );
};
export default PipelineDetailsTitle;

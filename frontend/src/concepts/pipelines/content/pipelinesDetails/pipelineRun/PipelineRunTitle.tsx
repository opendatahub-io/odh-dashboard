import * as React from 'react';
import { Label, Split, SplitItem } from '@patternfly/react-core';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import { computeRunStatus } from '~/concepts/pipelines/content/utils';

type PipelineRunTitleProps = {
  run?: PipelineRunKF;
};

const PipelineRunTitle: React.FC<PipelineRunTitleProps> = ({ run }) => {
  if (!run) {
    return <>Loading...</>;
  }

  const { icon, label } = computeRunStatus(run);

  return (
    <Split hasGutter>
      <SplitItem>{run.name}</SplitItem>
      <SplitItem>
        <Label icon={icon}>{label}</Label>
      </SplitItem>
    </Split>
  );
};

export default PipelineRunTitle;

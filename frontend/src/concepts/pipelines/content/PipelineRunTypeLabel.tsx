import React from 'react';
import { Label, Tooltip } from '@patternfly/react-core';
import { PipelineRunLabels } from '~/concepts/pipelines/content/tables/utils';
import { PipelineRecurringRunKF, PipelineRunKF } from '~/concepts/pipelines/kfTypes';

type PipelineRunTypeLabelProps = {
  run: PipelineRunKF | PipelineRecurringRunKF;
  isCompact?: boolean;
};
const PipelineRunTypeLabel: React.FC<PipelineRunTypeLabelProps> = ({ run, isCompact }) => (
  <>
    {run.recurring_run_id ? (
      <>
        <Tooltip content="Created by a schedule">
          <Label color="blue" isCompact={isCompact}>
            {PipelineRunLabels.RECURRING}
          </Label>
        </Tooltip>
      </>
    ) : (
      <>
        <Tooltip content={<div>Run once immediately after creation</div>}>
          <Label color="blue" isCompact={isCompact}>
            {PipelineRunLabels.ONEOFF}
          </Label>
        </Tooltip>
      </>
    )}
  </>
);
export default PipelineRunTypeLabel;

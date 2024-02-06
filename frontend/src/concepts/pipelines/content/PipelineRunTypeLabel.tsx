import React from 'react';
import { Label, Tooltip } from '@patternfly/react-core';
import { PipelineRunLabels } from '~/concepts/pipelines/content/tables/utils';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';

type PipelineRunTypeLabelProps = {
  run: PipelineRunKFv2;
  isCompact?: boolean;
};
const PipelineRunTypeLabel: React.FC<PipelineRunTypeLabelProps> = ({ run, isCompact }) => (
  <>
    {run.recurring_run_id ? (
      <>
        <Tooltip content="Created by a scheduled run">
          <Label color="blue" isCompact={isCompact}>
            {PipelineRunLabels.RECURRING}
          </Label>
        </Tooltip>
      </>
    ) : !run.pipeline_version_reference ? (
      <>
        <Tooltip content={<div>Created by a scheduled run that was deleted</div>}>
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

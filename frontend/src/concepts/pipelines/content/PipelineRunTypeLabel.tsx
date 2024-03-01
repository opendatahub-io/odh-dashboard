import React from 'react';
import { Label, Tooltip } from '@patternfly/react-core';
import {
  PipelineRunLabels,
  getJobResourceRef,
  getPipelineVersionResourceRef,
} from '~/concepts/pipelines/content/tables/utils';
import { PipelineCoreResourceKF } from '~/concepts/pipelines/kfTypes';

type PipelineRunTypeLabelProps = {
  resource: PipelineCoreResourceKF;
  isCompact?: boolean;
};
const PipelineRunTypeLabel: React.FC<PipelineRunTypeLabelProps> = ({ resource, isCompact }) => {
  const jobReference = getJobResourceRef(resource);
  const pipelineVersionRef = getPipelineVersionResourceRef(resource);

  return jobReference ? (
    <Tooltip content="Created by a scheduled run">
      <Label color="blue" isCompact={isCompact}>
        {PipelineRunLabels.RECURRING}
      </Label>
    </Tooltip>
  ) : !pipelineVersionRef ? (
    <Tooltip content={<div>Created by a scheduled run that was deleted</div>}>
      <Label color="blue" isCompact={isCompact}>
        {PipelineRunLabels.RECURRING}
      </Label>
    </Tooltip>
  ) : (
    <Tooltip content={<div>Run once immediately after creation</div>}>
      <Label color="blue" isCompact={isCompact}>
        {PipelineRunLabels.ONEOFF}
      </Label>
    </Tooltip>
  );
};
export default PipelineRunTypeLabel;

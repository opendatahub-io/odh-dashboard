import React from 'react';
import { Label, Tooltip } from '@patternfly/react-core';
import {
  PipelineRunLabels,
  getPipelineCoreResourceJobReference,
  getPipelineCoreResourcePipelineReference,
} from '~/concepts/pipelines/content/tables/utils';
import { PipelineCoreResourceKF } from '~/concepts/pipelines/kfTypes';

type PipelineRunTypeLabelProps = {
  resource: PipelineCoreResourceKF;
};
const PipelineRunTypeLabel: React.FC<PipelineRunTypeLabelProps> = ({ resource }) => {
  const jobReference = getPipelineCoreResourceJobReference(resource);
  const pipelineReference = getPipelineCoreResourcePipelineReference(resource);

  return (
    <>
      {jobReference ? (
        <>
          <Tooltip content={'Created by a scheduled run'}>
            <Label color="blue">{PipelineRunLabels.RECURRING}</Label>
          </Tooltip>
        </>
      ) : !pipelineReference ? (
        <>
          <Tooltip content={<div>Created by a scheduled run that was deleted</div>}>
            <Label color="blue">{PipelineRunLabels.RECURRING}</Label>
          </Tooltip>
        </>
      ) : (
        <>
          <Tooltip content={<div>Run once immediately after creation</div>}>
            <Label color="blue">{PipelineRunLabels.ONEOFF}</Label>
          </Tooltip>
        </>
      )}
    </>
  );
};
export default PipelineRunTypeLabel;

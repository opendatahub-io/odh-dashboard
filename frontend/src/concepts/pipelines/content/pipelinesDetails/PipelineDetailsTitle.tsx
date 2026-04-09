import React from 'react';
import { Label, Split, SplitItem, Truncate } from '@patternfly/react-core';
import { PipelineRunKF, StorageStateKF } from '#~/concepts/pipelines/kfTypes';
import { computeRunStatus } from '#~/concepts/pipelines/content/utils';
import PipelineRunTypeLabel from '#~/concepts/pipelines/content/PipelineRunTypeLabel';

type RecurringRunTitleProps = {
  run: PipelineRunKF;
  statusIcon?: boolean;
  pipelineRunLabel?: boolean;
  isRegistered?: boolean;
};

const PipelineDetailsTitle: React.FC<RecurringRunTitleProps> = ({
  run,
  statusIcon,
  pipelineRunLabel,
  isRegistered,
}) => {
  const { icon, label, color, labelStatus } = computeRunStatus(run);

  const isArchived = run.storage_state === StorageStateKF.ARCHIVED;

  return (
    <>
      <Split hasGutter>
        <SplitItem>
          {/* TODO: Remove the custom className after upgrading to PFv6 */}
          <Truncate content={run.display_name} className="truncate-no-min-width" />
        </SplitItem>
        {pipelineRunLabel && (
          <SplitItem>
            <PipelineRunTypeLabel run={run} />
          </SplitItem>
        )}
        {statusIcon && (
          <SplitItem>
            <Label
              variant="outline"
              color={color}
              status={labelStatus}
              icon={icon}
              data-testid="status-icon"
            >
              {label}
            </Label>
          </SplitItem>
        )}
        {isRegistered && (
          <SplitItem>
            <Label variant="outline" status="success">
              Model registered
            </Label>
          </SplitItem>
        )}
        {isArchived && (
          <SplitItem>
            <Label variant="outline">Archived</Label>
          </SplitItem>
        )}
      </Split>
    </>
  );
};
export default PipelineDetailsTitle;

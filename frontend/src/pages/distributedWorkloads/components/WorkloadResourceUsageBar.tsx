import * as React from 'react';
import { Tooltip, Stack, StackItem } from '@patternfly/react-core';
import { roundNumber } from '#~/utilities/number';
import ProgressBarWithLabels from '#~/components/ProgressBarWithLabels';

type WorkloadResourceUsageBarProps = {
  showData?: boolean;
  used?: number;
  requested?: number;
  metricLabel: string;
  unitLabel: string;
  progressBarAriaLabel: string;
};

export const WorkloadResourceUsageBar: React.FC<WorkloadResourceUsageBarProps> = ({
  showData = true,
  used = 0,
  requested = 0,
  metricLabel,
  unitLabel,
  progressBarAriaLabel,
}) => {
  if (!showData) {
    return '-';
  }
  return (
    <Tooltip
      isContentLeftAligned
      content={
        <Stack>
          <StackItem>
            {metricLabel} usage: {roundNumber(used, 3)} {unitLabel}
          </StackItem>
          <StackItem>
            {metricLabel} requested: {roundNumber(requested, 3)} {unitLabel}
          </StackItem>
        </Stack>
      }
    >
      <ProgressBarWithLabels
        textMinWidth="30px"
        inUseLabel={roundNumber(used)}
        maxValueLabel={roundNumber(requested)}
        value={used}
        min={0}
        max={requested}
        aria-label={progressBarAriaLabel}
      />
    </Tooltip>
  );
};

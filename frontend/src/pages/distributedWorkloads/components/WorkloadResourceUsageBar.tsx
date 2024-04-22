import * as React from 'react';
import { Progress, Tooltip, Stack, StackItem, Flex, FlexItem } from '@patternfly/react-core';
import { roundNumber } from '~/utilities/number';
import './WorkloadResourceUsageBar.scss';

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
      <Flex alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>{roundNumber(used)}</FlexItem>
        <FlexItem grow={{ default: 'grow' }}>
          <Progress
            className="dw-workload-resource-usage-bar"
            value={used}
            min={0}
            max={requested}
            measureLocation="none"
            aria-label={progressBarAriaLabel}
          />
        </FlexItem>
        <FlexItem>{roundNumber(requested)}</FlexItem>
      </Flex>
    </Tooltip>
  );
};

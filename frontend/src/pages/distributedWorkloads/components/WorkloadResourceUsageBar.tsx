import * as React from 'react';
import { Split, SplitItem, Progress, Tooltip, Stack, StackItem } from '@patternfly/react-core';
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
  const getColorSwatch = (className: string) => (
    <span className={`dw-workload-resource-usage-bar-color-swatch ${className}`}>&#x25A0;</span>
  );
  return (
    <Tooltip
      isContentLeftAligned
      content={
        <Stack>
          <StackItem>
            {getColorSwatch('used')} {metricLabel} usage: {used} {unitLabel}
          </StackItem>
          <StackItem>
            {getColorSwatch('requested')} {metricLabel} requested: {requested} {unitLabel}
          </StackItem>
        </Stack>
      }
    >
      <Split hasGutter className="dw-workload-resource-usage-bar-container">
        <SplitItem>{roundNumber(used)}</SplitItem>
        <SplitItem isFilled style={{ textAlign: 'center', verticalAlign: 'middle' }}>
          <Progress
            className="dw-workload-resource-usage-bar"
            value={used}
            min={0}
            max={requested}
            measureLocation="none"
            aria-label={progressBarAriaLabel}
          />
        </SplitItem>
        <SplitItem>{roundNumber(requested)}</SplitItem>
      </Split>
    </Tooltip>
  );
};

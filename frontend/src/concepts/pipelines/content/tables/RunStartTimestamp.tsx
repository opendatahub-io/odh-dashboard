import * as React from 'react';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { relativeTime } from '#~/utilities/time';
import { getRunStartTime } from './utils';

type RunStartTimestampProps = {
  run: { created_at: string; state_history?: object[] };
};

const RunStartTimestamp: React.FC<RunStartTimestampProps> = ({ run }) => {
  const startTime = getRunStartTime(run);
  const startMs = startTime.getTime();

  if (!Number.isFinite(startMs)) {
    return <>—</>;
  }

  return (
    <Timestamp date={startTime} tooltip={{ variant: TimestampTooltipVariant.default }}>
      {relativeTime(Date.now(), startMs)}
    </Timestamp>
  );
};

export default RunStartTimestamp;

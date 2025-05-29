import * as React from 'react';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { relativeTime } from '#~/utilities/time';

type PipelinesTableRowTimeProps = {
  date: Date;
};

const PipelinesTableRowTime: React.FC<PipelinesTableRowTimeProps> = ({ date }) => (
  <span style={{ whiteSpace: 'nowrap' }}>
    <Timestamp
      date={date}
      tooltip={{
        variant: TimestampTooltipVariant.default,
      }}
    >
      {relativeTime(Date.now(), date.getTime())}
    </Timestamp>
  </span>
);

export default PipelinesTableRowTime;

import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import React from 'react';
import { relativeTime } from '~/utilities/time';

type ConnectionTypesTableRowTimeProps = {
  date: Date;
};

const ConnectionTypesTableRowTime: React.FC<ConnectionTypesTableRowTimeProps> = ({ date }) => (
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

export default ConnectionTypesTableRowTime;

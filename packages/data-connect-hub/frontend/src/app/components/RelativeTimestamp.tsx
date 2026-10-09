import React from 'react';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { relativeTime } from '@odh-dashboard/ui-core/utilities/time';

type RelativeTimestampProps = {
  datetime: string;
};
const RelativeTimestamp: React.FC<RelativeTimestampProps> = ({ datetime }) => {
  const datetimeObject = new Date(datetime);

  if (Number.isNaN(datetimeObject.getTime())) {
    return <>-</>;
  }

  return (
    <Timestamp date={datetimeObject} tooltip={{ variant: TimestampTooltipVariant.default }}>
      {relativeTime(Date.now(), datetimeObject.getTime())}
    </Timestamp>
  );
};

export default RelativeTimestamp;

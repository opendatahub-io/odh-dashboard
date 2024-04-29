import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import React from 'react';
import { relativeTime } from '~/utilities/time';

type ModelLastModifiedProps = {
  lastUpdateTimeSinceEpoch?: string;
};

const ModelLastModified: React.FC<ModelLastModifiedProps> = ({ lastUpdateTimeSinceEpoch }) => {
  if (!lastUpdateTimeSinceEpoch) {
    return '--';
  }

  const time = new Date(parseInt(lastUpdateTimeSinceEpoch)).getTime();

  if (Number.isNaN(time)) {
    return '--';
  }

  return (
    <Timestamp
      date={new Date(lastUpdateTimeSinceEpoch)}
      tooltip={{
        variant: TimestampTooltipVariant.default,
      }}
    >
      {relativeTime(Date.now(), time)}
    </Timestamp>
  );
};

export default ModelLastModified;

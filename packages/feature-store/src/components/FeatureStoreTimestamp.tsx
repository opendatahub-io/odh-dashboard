import { Timestamp } from '@patternfly/react-core';
import * as React from 'react';

type FeatureStoreTimestampProps = {
  date: string | Date;
  dateFormat?: 'medium' | 'short';
  fallback?: string;
  timeFormat?: 'short' | 'medium';
};

const FeatureStoreTimestamp: React.FC<FeatureStoreTimestampProps> = ({
  date,
  fallback = '-',
  dateFormat = 'medium',
  timeFormat = 'short',
}) => {
  if (!date) {
    return <>{fallback}</>;
  }
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (Number.isNaN(dateObj.getTime())) {
    return <>{fallback}</>;
  }

  return (
    <Timestamp date={dateObj} shouldDisplayUTC dateFormat={dateFormat} timeFormat={timeFormat} />
  );
};

export default FeatureStoreTimestamp;

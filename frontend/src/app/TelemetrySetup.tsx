import * as React from 'react';
import { useSegmentTracking } from '#~/concepts/analyticsTracking/useSegmentTracking';
import { useTrackHistory } from '#~/concepts/analyticsTracking/useTrackHistory';

const TelemetrySetup: React.FC = () => {
  useSegmentTracking();
  useTrackHistory();

  return null;
};

export default TelemetrySetup;

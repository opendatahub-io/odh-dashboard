import * as React from 'react';
import { useTrackHistory } from '~/utilities/useTrackHistory';
import { useSegmentTracking } from '~/concepts/analyticsTracking/useSegmentTracking';

const TelemetrySetup: React.FC = () => {
  useSegmentTracking();
  useTrackHistory();

  return null;
};

export default TelemetrySetup;

import * as React from 'react';
import { useSegmentTracking } from '../utilities/useSegmentTracking';
import { useTrackHistory } from '../utilities/useTrackHistory';

const TelemetrySetup: React.FC = () => {
  useSegmentTracking();
  useTrackHistory();

  return null;
};

export default TelemetrySetup;

import * as React from 'react';
import {
  fireFormTrackingEvent,
  fireLinkTrackingEvent,
  fireSimpleTrackingEvent,
  firePageEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import type { UserInteractionProviderProps } from '@mf/modelRegistry/extension-points';

const segmentApi = {
  trackFormEvent: fireFormTrackingEvent,
  trackLinkEvent: fireLinkTrackingEvent,
  trackSimpleEvent: (eventName: string) => {
    fireSimpleTrackingEvent(eventName);
  },
  trackPageEvent: firePageEvent,
};

const SegmentUserInteractionProvider: React.FC<UserInteractionProviderProps> = ({ children }) => (
  <>{children(segmentApi)}</>
);

export default SegmentUserInteractionProvider;

import * as React from 'react';
import {
  fireFormTrackingEvent,
  fireLinkTrackingEvent,
  fireSimpleTrackingEvent,
  fireMiscTrackingEvent,
  firePageEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import type {
  UserInteractionProviderProps,
  UserInteractionAPI,
} from '@mf/modelRegistry/extension-points';

const segmentApi: UserInteractionAPI = {
  trackFormEvent: fireFormTrackingEvent,
  trackLinkEvent: fireLinkTrackingEvent,
  trackSimpleEvent: (
    eventName: string,
    properties?: Record<string, string | number | boolean | undefined>,
  ) => {
    if (properties && Object.keys(properties).length > 0) {
      fireMiscTrackingEvent(eventName, properties);
    } else {
      fireSimpleTrackingEvent(eventName);
    }
  },
  trackPageEvent: firePageEvent,
};

const SegmentUserInteractionProvider: React.FC<UserInteractionProviderProps> = ({ children }) => (
  <>{children(segmentApi)}</>
);

export default SegmentUserInteractionProvider;

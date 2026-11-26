import * as React from 'react';
import type { TrackPageEvent } from './types';

/** Observe a host-supplied route key without depending on the host's router. */
export const usePageTracking = (routeKey: string, trackPageEvent: TrackPageEvent): void => {
  const trackPageEventRef = React.useRef(trackPageEvent);

  React.useLayoutEffect(() => {
    trackPageEventRef.current = trackPageEvent;
  }, [trackPageEvent]);

  React.useEffect(() => {
    trackPageEventRef.current();
  }, [routeKey]);
};

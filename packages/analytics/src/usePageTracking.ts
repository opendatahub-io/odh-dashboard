import * as React from 'react';
import type { TrackPageEvent } from './types';

/** Observe a host-supplied route key without depending on the host's router. */
export const usePageTracking = (routeKey: string, trackPageEvent: TrackPageEvent): void => {
  React.useEffect(() => {
    trackPageEvent();
  }, [routeKey, trackPageEvent]);
};

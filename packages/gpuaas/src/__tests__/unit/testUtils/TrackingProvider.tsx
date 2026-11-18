import * as React from 'react';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import type { TrackEvent, TrackPageEvent } from '@odh-dashboard/analytics/types';

const noop = () => undefined;

export const createTrackingWrapper = (
  trackEvent: TrackEvent,
  trackPageEvent: TrackPageEvent = noop,
): React.FC<React.PropsWithChildren> => {
  const value = { trackEvent, trackPageEvent };
  const TrackingProvider: React.FC<React.PropsWithChildren> = ({ children }) => (
    <AnalyticsTrackingProvider value={value}>{children}</AnalyticsTrackingProvider>
  );
  return TrackingProvider;
};

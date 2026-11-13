import React from 'react';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import type { TrackEvent, TrackPageEvent } from '@odh-dashboard/analytics/types';

export const createTrackingTestWrapper = (value: {
  trackEvent: TrackEvent;
  trackPageEvent: TrackPageEvent;
}): React.FC<React.PropsWithChildren> => {
  const TrackingTestWrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <AnalyticsTrackingProvider value={value}>{children}</AnalyticsTrackingProvider>
  );
  return TrackingTestWrapper;
};

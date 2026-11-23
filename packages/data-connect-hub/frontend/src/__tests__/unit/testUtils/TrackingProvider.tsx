import React from 'react';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import type { TrackEvent } from '@odh-dashboard/analytics/types';

const trackPageEvent = () => undefined;

const TrackingProvider: React.FC<React.PropsWithChildren<{ trackEvent: TrackEvent }>> = ({
  children,
  trackEvent,
}) => {
  const value = React.useMemo(() => ({ trackEvent, trackPageEvent }), [trackEvent]);
  return <AnalyticsTrackingProvider value={value}>{children}</AnalyticsTrackingProvider>;
};

export default TrackingProvider;

import * as React from 'react';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import type { TrackEvent, TrackPageEvent } from '@odh-dashboard/analytics/types';

const noop = () => undefined;

export const TrackingProvider: React.FC<
  React.PropsWithChildren<{ trackEvent?: TrackEvent; trackPageEvent?: TrackPageEvent }>
> = ({ children, trackEvent = noop, trackPageEvent = noop }) => {
  const value = React.useMemo(() => ({ trackEvent, trackPageEvent }), [trackEvent, trackPageEvent]);
  return <AnalyticsTrackingProvider value={value}>{children}</AnalyticsTrackingProvider>;
};

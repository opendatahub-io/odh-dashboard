import * as React from 'react';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import type { TrackEvent } from '@odh-dashboard/analytics/types';

const noop = () => undefined;

export const createTrackingWrapper = (
  trackEvent: TrackEvent = noop,
  Wrapper?: React.JSXElementConstructor<{ children: React.ReactNode }>,
): React.FC<React.PropsWithChildren> => {
  const value = { trackEvent, trackPageEvent: noop };
  const TrackingProvider: React.FC<React.PropsWithChildren> = ({ children }) => (
    <AnalyticsTrackingProvider value={value}>
      {Wrapper ? <Wrapper>{children}</Wrapper> : children}
    </AnalyticsTrackingProvider>
  );
  return TrackingProvider;
};

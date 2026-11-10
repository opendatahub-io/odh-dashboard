import * as React from 'react';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import type { TrackEvent } from '@odh-dashboard/analytics/types';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';

const noOp = () => undefined;

export const TrackingProvider: React.FC<React.PropsWithChildren<{ trackEvent?: TrackEvent }>> = ({
  children,
  trackEvent = noOp,
}) => {
  const value = React.useMemo(() => ({ trackEvent, trackPageEvent: noOp }), [trackEvent]);
  return <AnalyticsTrackingProvider value={value}>{children}</AnalyticsTrackingProvider>;
};

export const createTrackingRender =
  (trackEvent: TrackEvent): ((ui: React.ReactNode, options?: RenderOptions) => RenderResult) =>
  (ui, options) =>
    render(<TrackingProvider trackEvent={trackEvent}>{ui}</TrackingProvider>, options);

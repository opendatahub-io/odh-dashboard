import * as React from 'react';
import { AnalyticsTrackingProvider } from './AnalyticsTrackingProvider';

const noOp = () => undefined;
const tracking = { trackEvent: noOp, trackPageEvent: noOp };

/** Explicitly disables tracking without changing the unprovided-context behavior. */
export const NoopAnalyticsTrackingProvider: React.FC<React.PropsWithChildren> = ({ children }) => (
  <AnalyticsTrackingProvider value={tracking}>{children}</AnalyticsTrackingProvider>
);

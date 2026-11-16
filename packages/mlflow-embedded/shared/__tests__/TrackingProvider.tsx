import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import type { TrackEvent, TrackPageEvent } from '@odh-dashboard/analytics/types';

const noOp = () => undefined;
const disabledTracking = { trackEvent: noOp, trackPageEvent: noOp };

export const renderWithTracking = (
  element: React.ReactElement,
  tracking: { trackEvent: TrackEvent; trackPageEvent: TrackPageEvent } = disabledTracking,
): RenderResult =>
  render(element, {
    wrapper: ({ children }) => (
      <AnalyticsTrackingProvider value={tracking}>{children}</AnalyticsTrackingProvider>
    ),
  });

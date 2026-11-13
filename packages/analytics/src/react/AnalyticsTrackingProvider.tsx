import * as React from 'react';
import type { TrackEvent, TrackPageEvent } from '../types';

type TrackingCallbacks = {
  trackEvent: TrackEvent;
  trackPageEvent: TrackPageEvent;
};

const notProvided = (operation: string) => () => {
  throw new Error(`AnalyticsTrackingProvider not provided: ${operation}`);
};

const TrackingContext = React.createContext<TrackingCallbacks>({
  trackEvent: notProvided('trackEvent'),
  trackPageEvent: notProvided('trackPageEvent'),
});

/** Supplies delivery callbacks without initializing an SDK or emitting events. */
export const AnalyticsTrackingProvider: React.FC<
  React.PropsWithChildren<{ value: TrackingCallbacks }>
> = ({ children, value }) => (
  <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>
);

export const useTrackEvent = (): TrackEvent => React.useContext(TrackingContext).trackEvent;

export const useTrackPageEvent = (): TrackPageEvent =>
  React.useContext(TrackingContext).trackPageEvent;

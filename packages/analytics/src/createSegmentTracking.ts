import { firePageEvent, fireTrackingEvent } from './segmentUtils';
import type { TrackEvent, TrackPageEvent } from './types';

export type SegmentTrackingOptions = {
  clusterID: string;
  devMode: boolean;
  version: string;
  /** Hosts can gate delivery independently of SDK initialization. Defaults to enabled. */
  enabled?: boolean;
};

/** Creates stable delivery callbacks that read current host policy and metadata per call. */
export const createSegmentTracking = (
  getOptions: () => SegmentTrackingOptions,
): { trackEvent: TrackEvent; trackPageEvent: TrackPageEvent } => ({
  trackEvent: (eventName, properties, eventOptions) => {
    const options = getOptions();
    if (options.enabled !== false) {
      fireTrackingEvent(eventName, properties, options, eventOptions);
    }
  },
  trackPageEvent: () => {
    const options = getOptions();
    if (options.enabled !== false) {
      firePageEvent(options);
    }
  },
});

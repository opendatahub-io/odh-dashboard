export { initSegment } from './initSegment';
export type { InitSegmentOptions, SegmentConnectionOptions } from './initSegment';
export { useSegmentSetup } from './useSegmentSetup';
export { usePageTracking } from './usePageTracking';
export type { SegmentSetupOptions } from './useSegmentSetup';
export { createSegmentTracking } from './createSegmentTracking';
export type { SegmentTrackingOptions } from './createSegmentTracking';
export {
  fireTrackingEvent,
  firePageEvent,
  fireIdentifyEvent,
  computeAnonymousUserId,
  isSegmentReady,
} from './segmentUtils';
export type { BaseTrackingEventProperties } from './segmentUtils';

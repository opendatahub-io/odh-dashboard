export {
  fireFormTrackingEvent,
  fireLinkTrackingEvent,
  fireMiscTrackingEvent,
  fireSimpleTrackingEvent,
  fireIdentifyEvent,
  firePageEvent,
} from './segmentIOUtils';

export { initSegment } from './initSegment';
export { initAmplitude } from './initAmplitude';

export type {
  ODHSegmentKey,
  IdentifyEventProperties,
  BaseTrackingEventProperties,
  BaseFormTrackingEventProperties,
  FormTrackingEventProperties,
  LinkTrackingEventProperties,
  MiscTrackingEventProperties,
} from './trackingProperties';

export { TrackingOutcome } from './trackingProperties';

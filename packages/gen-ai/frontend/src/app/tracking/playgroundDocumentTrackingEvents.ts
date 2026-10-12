import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import type {
  FormTrackingEventProperties,
  MiscTrackingEventProperties,
} from '@odh-dashboard/ui-core/contexts/AnalyticsContext';
import type { TrackingOutcome } from '@odh-dashboard/ui-core';
import { PLAYGROUND_DOCUMENT_EVENTS } from './playgroundDocumentTrackingConstants';

type DocumentAttachedEventProperties = {
  success: boolean;
  outcome: TrackingOutcome;
  documentCountAdded: number;
  documentFileTypes: string[];
  source: 'filePicker';
  error: 'unsupportedType' | 'fileTooLarge' | 'uploadFailed' | null;
};

type DocumentContentViewedEventProperties = {
  documentCount: number;
  documentFileType: string;
  viewSource: 'attachmentCard';
  success: true;
  error: null;
};

type SegmentSerializableProperty = string | number | boolean | readonly string[] | null;
type SegmentSerializable<T> = { [Key in keyof T]: SegmentSerializableProperty };

// Shared helper types omit array and null values. Keep this bridge in Gen AI and ensure
// every event property stays Segment-serializable before passing it to the shared helper.
export const fireDocumentAttachedEvent = (properties: DocumentAttachedEventProperties): void => {
  const serializableProperties: SegmentSerializable<DocumentAttachedEventProperties> = properties;
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const trackingProperties = serializableProperties as unknown as FormTrackingEventProperties;
  fireFormTrackingEvent(PLAYGROUND_DOCUMENT_EVENTS.ATTACHED, trackingProperties);
};

export const fireDocumentContentViewedEvent = (
  properties: DocumentContentViewedEventProperties,
): void => {
  const serializableProperties: SegmentSerializable<DocumentContentViewedEventProperties> =
    properties;
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const trackingProperties = serializableProperties as unknown as MiscTrackingEventProperties;
  fireMiscTrackingEvent(PLAYGROUND_DOCUMENT_EVENTS.CONTENT_VIEWED, trackingProperties);
};

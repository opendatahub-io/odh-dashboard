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

// The shared helper types do not include array or null values, but Segment accepts both.
export const fireDocumentAttachedEvent = (properties: DocumentAttachedEventProperties): void => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const trackingProperties = properties as unknown as FormTrackingEventProperties;
  fireFormTrackingEvent(PLAYGROUND_DOCUMENT_EVENTS.ATTACHED, trackingProperties);
};

export const fireDocumentContentViewedEvent = (
  properties: DocumentContentViewedEventProperties,
): void => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const trackingProperties = properties as unknown as MiscTrackingEventProperties;
  fireMiscTrackingEvent(PLAYGROUND_DOCUMENT_EVENTS.CONTENT_VIEWED, trackingProperties);
};

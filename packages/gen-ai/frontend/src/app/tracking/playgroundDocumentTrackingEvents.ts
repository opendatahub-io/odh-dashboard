import type { TrackEvent, TrackingOutcome } from '@odh-dashboard/analytics/types';
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

export const fireDocumentAttachedEvent = (
  trackEvent: TrackEvent,
  properties: DocumentAttachedEventProperties,
): void => {
  trackEvent(PLAYGROUND_DOCUMENT_EVENTS.ATTACHED, properties);
};

export const fireDocumentContentViewedEvent = (
  trackEvent: TrackEvent,
  properties: DocumentContentViewedEventProperties,
): void => {
  trackEvent(PLAYGROUND_DOCUMENT_EVENTS.CONTENT_VIEWED, properties);
};

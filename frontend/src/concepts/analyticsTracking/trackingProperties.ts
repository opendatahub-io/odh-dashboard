export type ODHSegmentKey = {
  segmentKey: string;
};

export type {
  IdentifyEventProperties,
  LinkTrackingEventProperties,
  MiscTrackingEventProperties,
} from '@odh-dashboard/ui-core/contexts/AnalyticsContext';

// eslint-disable-next-line @typescript-eslint/ban-types
export type BaseTrackingEventProperties = {
  // empty for the moment
};

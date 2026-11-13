// Configures the shared Segment adapter and retains legacy tracking helpers.
// Feature packages use @odh-dashboard/analytics/react or injected callbacks.
// Remove these wrappers as their consumers migrate; SDK and identity lifecycle remain host-owned.
import type {
  FormTrackingEventProperties,
  IdentifyEventProperties,
  LinkTrackingEventProperties,
  MiscTrackingEventProperties,
} from '@odh-dashboard/analytics/types';
import {
  createSegmentTracking,
  fireIdentifyEvent as fireIdentifyEventCore,
} from '@odh-dashboard/analytics';
import { DEV_MODE, INTERNAL_DASHBOARD_VERSION } from '#~/utilities/const';

const getTrackingParams = () => ({
  clusterID: window.clusterID ?? '',
  devMode: DEV_MODE,
  version: INTERNAL_DASHBOARD_VERSION,
});

export const segmentTracking = createSegmentTracking(getTrackingParams);

export const fireFormTrackingEvent = (
  eventName: string,
  properties: FormTrackingEventProperties,
): void => {
  segmentTracking.trackEvent(eventName, properties);
};

export const fireLinkTrackingEvent = (
  eventName: string,
  properties: LinkTrackingEventProperties,
): void => {
  segmentTracking.trackEvent(eventName, properties);
};

export const fireMiscTrackingEvent = (
  eventName: string,
  properties: MiscTrackingEventProperties,
): void => {
  if (DEV_MODE) {
    /* eslint-disable-next-line no-console */
    console.warn('This tracking event type is a last resort for legacy purposes');
  }
  segmentTracking.trackEvent(eventName, properties);
};

export const fireSimpleTrackingEvent = (eventName: string): void => {
  segmentTracking.trackEvent(eventName, {});
};

export const firePageEvent = (): void => {
  segmentTracking.trackPageEvent();
};

export const fireIdentifyEvent = (properties: IdentifyEventProperties): void => {
  fireIdentifyEventCore(properties, getTrackingParams());
};

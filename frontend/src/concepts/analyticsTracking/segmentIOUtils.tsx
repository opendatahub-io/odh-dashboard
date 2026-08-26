// These wrappers bind environment-specific values (clusterID, devMode, version)
// to the parameterized functions from @odh-dashboard/analytics. Once all consumers
// migrate to useAnalytics() from @odh-dashboard/ui-core, this file can be removed.
import type {
  FormTrackingEventProperties,
  IdentifyEventProperties,
  LinkTrackingEventProperties,
  MiscTrackingEventProperties,
} from '@odh-dashboard/ui-core/contexts/AnalyticsContext';
import {
  fireTrackingEvent as fireTrackingEventCore,
  firePageEvent as firePageEventCore,
  fireIdentifyEvent as fireIdentifyEventCore,
} from '@odh-dashboard/analytics';
import { DEV_MODE, INTERNAL_DASHBOARD_VERSION } from '#~/utilities/const';

const getTrackingParams = () => ({
  clusterID: window.clusterID ?? '',
  devMode: DEV_MODE,
  version: INTERNAL_DASHBOARD_VERSION,
});

export const fireFormTrackingEvent = (
  eventName: string,
  properties: FormTrackingEventProperties,
): void => {
  fireTrackingEventCore(eventName, properties, getTrackingParams());
};

export const fireLinkTrackingEvent = (
  eventName: string,
  properties: LinkTrackingEventProperties,
): void => {
  fireTrackingEventCore(eventName, properties, getTrackingParams());
};

export const fireMiscTrackingEvent = (
  eventName: string,
  properties: MiscTrackingEventProperties,
): void => {
  if (DEV_MODE) {
    /* eslint-disable-next-line no-console */
    console.warn('This tracking event type is a last resort for legacy purposes');
  }
  fireTrackingEventCore(eventName, properties, getTrackingParams());
};

export const fireSimpleTrackingEvent = (eventName: string): void => {
  fireTrackingEventCore(eventName, {}, getTrackingParams());
};

export const firePageEvent = (): void => {
  firePageEventCore(getTrackingParams());
};

export const fireIdentifyEvent = (properties: IdentifyEventProperties): void => {
  fireIdentifyEventCore(properties, getTrackingParams());
};

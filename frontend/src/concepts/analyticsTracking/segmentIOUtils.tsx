import { DEV_MODE, INTERNAL_DASHBOARD_VERSION } from '#~/utilities/const';
import {
  BaseTrackingEventProperties,
  FormTrackingEventProperties,
  IdentifyEventProperties,
  LinkTrackingEventProperties,
  MiscTrackingEventProperties,
} from '#~/concepts/analyticsTracking/trackingProperties';

export const fireFormTrackingEvent = (
  eventName: string,
  properties: FormTrackingEventProperties,
): void => {
  fireTrackingEvent(eventName, properties);
};

export const fireLinkTrackingEvent = (
  eventName: string,
  properties: LinkTrackingEventProperties,
): void => {
  fireTrackingEvent(eventName, properties);
};

export const fireMiscTrackingEvent = (
  eventName: string,
  properties: MiscTrackingEventProperties,
): void => {
  if (DEV_MODE) {
    /* eslint-disable-next-line no-console */
    console.warn('This tracking event type is a last resort for legacy purposes');
  }
  fireTrackingEvent(eventName, properties);
};

export const fireSimpleTrackingEvent = (eventName: string): void => {
  fireTrackingEvent(eventName, {});
};

/*
 * This fires a segment 'track' event.
 *
 * @param eventName: Name of the event.
 * @param properties: Properties of the event. Those are specific to eventName
 *
 */
const fireTrackingEvent = (eventName: string, properties: BaseTrackingEventProperties): void => {
  const clusterID = window.clusterID ?? '';
  if (DEV_MODE) {
    /* eslint-disable-next-line no-console */
    console.log(
      `Telemetry event triggered: ${eventName} - ${JSON.stringify(
        properties,
      )} for version ${INTERNAL_DASHBOARD_VERSION}`,
    );
    if (eventName === 'page' || eventName === 'identify') {
      window.alert('Got a page or identify event. Must not happen');
    }
  } else if (window.analytics) {
    window.analytics.track(
      eventName,
      { ...properties, clusterID },
      {
        app: {
          version: INTERNAL_DASHBOARD_VERSION,
        },
      },
    );
  }
};

/*
 * This fires a 'PageViewed' event. The url, referrer etc. are
 * set internally in the Segment library.
 */
export const firePageEvent = (): void => {
  const clusterID = window.clusterID ?? '';
  if (DEV_MODE) {
    /* eslint-disable-next-line no-console */
    console.log(
      `Page event triggered for version ${INTERNAL_DASHBOARD_VERSION} : ${window.location.pathname}`,
    );
  } else if (window.analytics) {
    window.analytics.page(
      undefined,
      { clusterID },
      {
        app: {
          version: INTERNAL_DASHBOARD_VERSION,
        },
      },
    );
  }
};

// Stuff that gets send over as traits on an identify call. Must not include (anonymous) user Id.
type IdentifyTraits = {
  isAdmin: boolean;
  canCreateProjects: boolean;
  clusterID: string;
};

/*
 * This fires a call to associate further processing with the passed (anonymous) userId
 * in the properties.
 */
export const fireIdentifyEvent = (properties: IdentifyEventProperties): void => {
  const clusterID = window.clusterID ?? '';
  if (DEV_MODE) {
    /* eslint-disable-next-line no-console */
    console.log(`Identify event triggered: ${JSON.stringify(properties)}`);
  } else if (window.analytics) {
    const traits: IdentifyTraits = {
      clusterID,
      isAdmin: properties.isAdmin,
      canCreateProjects: properties.canCreateProjects,
    };
    window.analytics.identify(properties.userID, traits);
  }
};

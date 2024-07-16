import { DEV_MODE, INTERNAL_DASHBOARD_VERSION } from '~/utilities/const';
import { TrackingEventProperties } from '~/concepts/analyticsTracking/trackingProperties';

// The following is like the original method below, but allows for more 'free form' properties.
// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
export const fireTrackingEventRaw = (eventType: string, properties?: any): void => {
  const clusterID = window.clusterID ?? '';
  if (DEV_MODE) {
    /* eslint-disable-next-line no-console */
    console.log(
      `Telemetry event triggered: ${eventType}${
        properties
          ? ` - ${JSON.stringify(properties)} for version ${INTERNAL_DASHBOARD_VERSION}`
          : ''
      }`,
    );
  } else if (window.analytics) {
    window.analytics.track(
      eventType,
      { ...properties, clusterID },
      {
        app: {
          version: INTERNAL_DASHBOARD_VERSION,
        },
      },
    );
  }
};

export const fireTrackingEvent = (
  eventType: string,
  properties?: TrackingEventProperties,
): void => {
  const clusterID = window.clusterID ?? '';
  if (DEV_MODE) {
    /* eslint-disable-next-line no-console */
    console.log(
      `Telemetry event triggered: ${eventType}${
        properties
          ? ` - ${JSON.stringify(properties)} for version ${INTERNAL_DASHBOARD_VERSION}`
          : ''
      }`,
    );
  } else if (window.analytics) {
    switch (eventType) {
      case 'identify':
        window.analytics.identify(properties?.anonymousID, { clusterID });
        break;
      case 'page':
        window.analytics.page(
          undefined,
          { clusterID },
          {
            app: {
              version: INTERNAL_DASHBOARD_VERSION,
            },
          },
        );
        break;
      default:
        window.analytics.track(
          eventType,
          { ...properties, clusterID },
          {
            app: {
              version: INTERNAL_DASHBOARD_VERSION,
            },
          },
        );
    }
  }
};

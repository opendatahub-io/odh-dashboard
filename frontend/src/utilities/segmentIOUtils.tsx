import { TrackingEventProperties } from '~/types';
import { DEV_MODE, INTERNAL_DASHBOARD_VERSION } from './const';

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

export const initSegment = async (props: {
  segmentKey: string;
  username: string;
  enabled: boolean;
}): Promise<void> => {
  const { segmentKey, username, enabled } = props;
  const analytics = (window.analytics = window.analytics || []);
  if (analytics.initialize) {
    return;
  }
  if (analytics.invoked) {
    /* eslint-disable-next-line no-console */
    console.error('Segment snippet included twice.');
  } else {
    analytics.invoked = true;
    analytics.methods = [
      'trackSubmit',
      'trackClick',
      'trackLink',
      'trackForm',
      'pageview',
      'identify',
      'reset',
      'group',
      'track',
      'ready',
      'alias',
      'debug',
      'page',
      'once',
      'off',
      'on',
      'addSourceMiddleware',
      'addIntegrationMiddleware',
      'setAnonymousId',
      'addDestinationMiddleware',
    ];
    analytics.factory =
      (e: string) =>
      (...t: unknown[]) => {
        t.unshift(e);
        analytics.push(t);
        return analytics;
      };
    for (let e = 0; e < analytics.methods.length; e++) {
      const key = analytics.methods[e];
      analytics[key] = analytics.factory(key);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analytics.load = (key: string, options: any) => {
      const t = document.createElement('script');
      t.type = 'text/javascript';
      t.async = true;
      t.src = `https://console.redhat.com/connections/cdn/analytics.js/v1/${encodeURIComponent(
        key,
      )}/analytics.min.js`;
      const n = document.getElementsByTagName('script')[0];
      if (n.parentNode) {
        n.parentNode.insertBefore(t, n);
      }
      analytics._loadOptions = options;
    };
    analytics.SNIPPET_VERSION = '4.13.1';
    if (segmentKey && enabled) {
      analytics.load(segmentKey, {
        integrations: {
          'Segment.io': {
            apiHost: 'console.redhat.com/connections/api/v1',
            protocol: 'https',
          },
        },
      });
    }
    const anonymousIDBuffer = await crypto.subtle.digest(
      'SHA-1',
      new TextEncoder().encode(username),
    );
    const anonymousIDArray = Array.from(new Uint8Array(anonymousIDBuffer));
    const anonymousID = anonymousIDArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    fireTrackingEvent('identify', { anonymousID });
    fireTrackingEvent('page');
  }
};

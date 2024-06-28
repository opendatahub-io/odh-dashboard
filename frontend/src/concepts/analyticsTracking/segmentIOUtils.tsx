import {
  IdentifyEventProperties, TrackingEventProperties,
} from '~/concepts/analyticsTracking/trackingProperties';
import { DEV_MODE, INTERNAL_DASHBOARD_VERSION } from '~/utilities/const';

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
    if ((eventType === 'identify') || ( eventType === 'page')) {
      window.alert(`Event of type ${eventType} is not supported`);
    }
  } else if (window.analytics) {
    switch (eventType) {
      case 'identify':
        window.analytics.identify(properties?.anonymousID, { clusterID });
        /* eslint-disable-next-line no-console */
        console.warn('Identify event triggered through fireTrackingEvent, must not happen');
        break;
      case 'page':
        /* eslint-disable-next-line no-console */
        console.warn('Page event triggered through fireTrackingEvent, must not happen');
        firePageEvent();
        break;
      default:
        window.analytics.track(eventType, { ...properties, clusterID });
    }
  }
};

export const firePageEvent = (): void => {
  if (DEV_MODE) {
    /* eslint-disable-next-line no-console */
    console.log(`Page event triggered for version ${INTERNAL_DASHBOARD_VERSION}`);
  } else if (window.analytics) {
    const clusterID = window.clusterID ?? '';
    window.analytics.page(undefined, { clusterID });
  }
};

export const fireIdentifyEvent = (properties: IdentifyEventProperties): void => {
  if (DEV_MODE) {
    /* eslint-disable-next-line no-console */
    console.log(
      `Identify event triggered:  ${JSON.stringify(
        properties,
      )} for version ${INTERNAL_DASHBOARD_VERSION}`,
    );
  } else if (window.analytics) {
    const clusterID = window.clusterID ?? '';
    window.analytics.identify(properties.anonymousID, { clusterID });
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
    // const anonymousIDBuffer = await crypto.subtle.digest(
    //   'SHA-1',
    //   new TextEncoder().encode(username),
    // );
    // const anonymousIDArray = Array.from(new Uint8Array(anonymousIDBuffer));
    // const anonymousID = anonymousIDArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    // fireIdentifyEvent({ anonymousID });
    // firePageEvent();
  }
};

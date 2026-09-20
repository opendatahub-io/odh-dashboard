import type { IdentifyEventProperties } from '@odh-dashboard/ui-core/contexts/AnalyticsContext';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analytics?: any;
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type BaseTrackingEventProperties = {};

export const computeAnonymousUserId = async (username: string): Promise<string> => {
  const buffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(username));
  const array = Array.from(new Uint8Array(buffer));
  return array.map((b) => b.toString(16).padStart(2, '0')).join('');
};

export type IdentifyTraits = {
  isAdmin: boolean;
  canCreateProjects: boolean;
  clusterID: string;
};

export const fireTrackingEvent = (
  eventName: string,
  properties: BaseTrackingEventProperties,
  params: { clusterID: string; devMode: boolean; version: string },
): void => {
  const { clusterID, devMode, version } = params;
  if (devMode) {
    /* eslint-disable-next-line no-console */
    console.log(
      `Telemetry event triggered: ${eventName} - ${JSON.stringify(
        properties,
      )} for version ${version}`,
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
          version,
        },
      },
    );
  }
};

export const firePageEvent = (params: {
  clusterID: string;
  devMode: boolean;
  version: string;
}): void => {
  const { clusterID, devMode, version } = params;
  if (devMode) {
    /* eslint-disable-next-line no-console */
    console.log(`Page event triggered for version ${version} : ${window.location.pathname}`);
  } else if (window.analytics) {
    window.analytics.page(
      undefined,
      { clusterID },
      {
        app: {
          version,
        },
      },
    );
  }
};

export const fireIdentifyEvent = (
  properties: IdentifyEventProperties,
  params: { clusterID: string; devMode: boolean },
): void => {
  const { clusterID, devMode } = params;
  if (devMode) {
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

/* eslint-disable camelcase */
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';

declare global {
  interface Window {
    __evalHubTrackingEvents?: Set<string>;
  }
}

export type EvalHubCollectionType = 'system' | 'custom' | 'unknown';

export type EvalHubTrackingContext = {
  collectionType?: EvalHubCollectionType;
  providerType?: string;
};

export type EvalHubTrackingProperties = Record<string, unknown>;

export type EvalHubTrackingOnce = (
  eventName: string,
  key: string,
  properties?: EvalHubTrackingProperties,
  context?: EvalHubTrackingContext,
) => void;

export type EvalHubTrackingScope = {
  trackEventOnce: EvalHubTrackingOnce;
  clear: () => void;
};

let evalHubServerVersion = 'unknown';

export const setEvalHubServerVersion = (version?: string): void => {
  evalHubServerVersion = version?.trim() || 'unknown';
};

export const getEvalHubServerVersion = (): string => evalHubServerVersion;

const redactUrl = (value: unknown): unknown => {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }

  try {
    return new URL(value, window.location.origin).origin;
  } catch {
    return '[redacted]';
  }
};

const sanitizeProperties = (properties: EvalHubTrackingProperties): EvalHubTrackingProperties =>
  Object.fromEntries(
    Object.entries(properties).map(([key, value]) =>
      key === 'url' || key === 'href' ? [key, redactUrl(value)] : [key, value],
    ),
  );

export const trackEvalHubEvent = (
  eventName: string,
  properties: EvalHubTrackingProperties = {},
  context: EvalHubTrackingContext = {},
): void => {
  fireMiscTrackingEvent(eventName, {
    ...sanitizeProperties(properties),
    event_source: 'evalhub_ui',
    evalhub_server_version: evalHubServerVersion,
    collection_type: context.collectionType ?? 'unknown',
    provider_type: context.providerType ?? 'unknown',
  });
};

const trackEvalHubEventOnceInScope = (
  eventName: string,
  key: string,
  properties: EvalHubTrackingProperties = {},
  context: EvalHubTrackingContext = {},
  viewKeys?: Set<string>,
): void => {
  const dedupeKey = `evalhub:${eventName}:${key}`;
  const emittedEvents = getEmittedEvents();
  if (emittedEvents.has(dedupeKey)) {
    return;
  }
  emittedEvents.add(dedupeKey);
  viewKeys?.add(dedupeKey);
  trackEvalHubEvent(eventName, properties, context);
};

export const trackEvalHubEventOnce: EvalHubTrackingOnce = (
  eventName,
  key,
  properties,
  context,
): void => {
  trackEvalHubEventOnceInScope(eventName, key, properties, context);
};

export const createEvalHubTrackingScope = (): EvalHubTrackingScope => {
  const viewKeys = new Set<string>();

  return {
    trackEventOnce: (eventName, key, properties, context) =>
      trackEvalHubEventOnceInScope(eventName, key, properties, context, viewKeys),
    clear: () => {
      const emittedEvents = getEmittedEvents();
      viewKeys.forEach((dedupeKey) => emittedEvents.delete(dedupeKey));
      viewKeys.clear();
    },
  };
};

const getEmittedEvents = (): Set<string> => {
  window.__evalHubTrackingEvents ??= new Set<string>();
  return window.__evalHubTrackingEvents;
};

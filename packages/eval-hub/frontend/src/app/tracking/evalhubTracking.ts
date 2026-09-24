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

export const trackEvalHubEventOnce = (
  eventName: string,
  key: string,
  properties: EvalHubTrackingProperties = {},
  context: EvalHubTrackingContext = {},
): void => {
  const dedupeKey = `evalhub:${eventName}:${key}`;
  const emittedEvents = getEmittedEvents();
  if (emittedEvents.has(dedupeKey)) {
    return;
  }
  emittedEvents.add(dedupeKey);
  trackEvalHubEvent(eventName, properties, context);
};

const getEmittedEvents = (): Set<string> => {
  window.__evalHubTrackingEvents ??= new Set<string>();
  return window.__evalHubTrackingEvents;
};

/* eslint-disable camelcase */
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import type { FormTrackingEventProperties, TrackingOutcome } from '@odh-dashboard/ui-core';
import { evaluationErrorCategory, type EvaluationStatusMessage } from './evaluationErrorCategory';
import {
  EVAL_HUB_EVENT_PROPERTY_ALLOWLIST,
  type EvalHubEventName,
  type EvalHubEventProperties,
} from './evalhubTrackingConstants';

export type { EvalHubCollectionSurface } from './evalhubTrackingConstants';

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

export type EvalHubTrackingOnce = <TEventName extends EvalHubEventName>(
  eventName: TEventName,
  key: string,
  properties: EvalHubEventProperties[TEventName],
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

const isEvaluationStatusMessage = (value: unknown): value is EvaluationStatusMessage =>
  typeof value === 'object' && value !== null;

// Error diagnostics can embed user-submitted content; reduce them to a controlled
// message-code category before they leave the app.
const sanitizeError = (value: unknown): unknown =>
  isEvaluationStatusMessage(value) ? evaluationErrorCategory(value) : value;

const sanitizeProperties = (properties: EvalHubTrackingProperties): EvalHubTrackingProperties =>
  Object.fromEntries(
    Object.entries(properties).map(([key, value]) => {
      if (key === 'url' || key === 'href') {
        return [key, redactUrl(value)];
      }
      if (key === 'error') {
        return [key, sanitizeError(value)];
      }
      return [key, value];
    }),
  );

// Structural typing lets a value carrying keys beyond its declared type reach this
// boundary, so only keys the event explicitly declares are forwarded.
const dropDisallowedProperties = (
  eventName: EvalHubEventName,
  properties: EvalHubTrackingProperties,
): EvalHubTrackingProperties => {
  const allowedKeys: readonly string[] = EVAL_HUB_EVENT_PROPERTY_ALLOWLIST[eventName];
  return Object.fromEntries(
    Object.entries(properties).filter(([key]) => allowedKeys.includes(key)),
  );
};

const isTrackingOutcome = (value: unknown): value is TrackingOutcome =>
  value === 'submit' || value === 'cancel';

const isFormTrackingProperty = (value: unknown): value is string | number | boolean | undefined =>
  value === undefined || ['string', 'number', 'boolean'].includes(typeof value);

const getFormTrackingProperties = (
  properties: EvalHubTrackingProperties,
  outcome: TrackingOutcome,
): FormTrackingEventProperties => {
  const formProperties: FormTrackingEventProperties = { outcome };

  Object.entries(properties).forEach(([key, value]) => {
    if (key !== 'outcome' && isFormTrackingProperty(value)) {
      formProperties[key] = value;
    }
  });

  return formProperties;
};

export const trackEvalHubEvent = <TEventName extends EvalHubEventName>(
  eventName: TEventName,
  properties: EvalHubEventProperties[TEventName],
  context: EvalHubTrackingContext = {},
): void => {
  const enrichedProps = {
    ...dropDisallowedProperties(eventName, sanitizeProperties(properties)),
    event_source: 'evalhub_ui',
    evalhub_server_version: evalHubServerVersion,
    collection_type: context.collectionType ?? 'unknown',
    provider_type: context.providerType ?? 'unknown',
  };

  // Use fireFormTrackingEvent for events with a form outcome (submit/cancel)
  const outcome = 'outcome' in properties ? properties.outcome : undefined;
  if (isTrackingOutcome(outcome)) {
    fireFormTrackingEvent(eventName, getFormTrackingProperties(enrichedProps, outcome));
  } else {
    fireMiscTrackingEvent(eventName, enrichedProps);
  }
};

const trackEvalHubEventOnceInScope = <TEventName extends EvalHubEventName>(
  eventName: TEventName,
  key: string,
  properties: EvalHubEventProperties[TEventName],
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

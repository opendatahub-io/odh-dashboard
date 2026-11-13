/* eslint-disable camelcase */
import type {
  FormTrackingEventProperties,
  TrackingOutcome,
  TrackEvent,
  TrackEventOptions,
} from '@odh-dashboard/analytics/types';
import { sanitizeEvalHubPageContext } from './evalhubPageContextRedaction';
import { evaluationErrorCategory, type EvaluationStatusMessage } from './evaluationErrorCategory';
import {
  EVAL_HUB_EVENT_PROPERTY_ALLOWLIST,
  type EvalHubEventName,
  type EvalHubEventProperties,
} from './evalhubTrackingConstants';

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

// Custom suite names are user-entered free text and can embed PII (RHAI-838 R4:
// no PII in Segment payloads). Only curated (system) collections — whose names are
// product-defined taxonomy — are reported; unknown provenance fails closed.
const sanitizeProperties = (
  properties: EvalHubTrackingProperties,
  context: EvalHubTrackingContext,
): EvalHubTrackingProperties =>
  Object.fromEntries(
    Object.entries(properties)
      .filter(([key]) => key !== 'collectionName' || context.collectionType === 'system')
      .map(([key, value]) => {
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

const prepareEvalHubEvent = <TEventName extends EvalHubEventName>(
  eventName: TEventName,
  properties: EvalHubEventProperties[TEventName],
  context: EvalHubTrackingContext = {},
): Parameters<TrackEvent>[1] => {
  const enrichedProps = {
    ...dropDisallowedProperties(eventName, sanitizeProperties(properties, context)),
    event_source: 'evalhub_ui',
    collection_type: context.collectionType ?? 'unknown',
    provider_type: context.providerType ?? 'unknown',
  };
  const outcome = 'outcome' in properties ? properties.outcome : undefined;
  return isTrackingOutcome(outcome)
    ? getFormTrackingProperties(enrichedProps, outcome)
    : enrichedProps;
};

export type EvalHubTrackEvent = <TEventName extends EvalHubEventName>(
  eventName: TEventName,
  properties: EvalHubEventProperties[TEventName],
  context?: EvalHubTrackingContext,
) => void;

const trackEvalHubEventOnceInScope = (
  trackEvent: EvalHubTrackEvent,
  eventName: EvalHubEventName,
  key: string,
  properties: EvalHubEventProperties[EvalHubEventName],
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
  trackEvent(eventName, properties, context);
};

const createEvalHubTrackingScope = (trackEvent: EvalHubTrackEvent): EvalHubTrackingScope => {
  const viewKeys = new Set<string>();
  return {
    trackEventOnce: (eventName, key, properties, context) =>
      trackEvalHubEventOnceInScope(trackEvent, eventName, key, properties, context, viewKeys),
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

export type { EvalHubCollectionSurface } from './evalhubTrackingConstants';

export type EvalHubTracking = {
  trackEvent: EvalHubTrackEvent;
  trackEventOnce: EvalHubTrackingOnce;
  createScope: () => EvalHubTrackingScope;
};

const deliveryOptions: TrackEventOptions = {
  pageContextPolicy: (page) => ({
    ...page,
    ...sanitizeEvalHubPageContext(page, window.location.origin),
  }),
};

export const createEvalHubTracking = (deliver: TrackEvent): EvalHubTracking => {
  const trackEvent: EvalHubTrackEvent = (eventName, properties, context) => {
    deliver(eventName, prepareEvalHubEvent(eventName, properties, context), deliveryOptions);
  };
  const trackEventOnce: EvalHubTrackingOnce = (eventName, key, properties, context) =>
    trackEvalHubEventOnceInScope(trackEvent, eventName, key, properties, context);
  return {
    trackEvent,
    trackEventOnce,
    createScope: () => createEvalHubTrackingScope(trackEvent),
  };
};

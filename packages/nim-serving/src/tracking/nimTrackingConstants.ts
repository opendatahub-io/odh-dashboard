import { TrackingOutcome, type TrackEvent } from '@odh-dashboard/analytics/types';

export enum NimAccountTrackingEvent {
  ENABLED = 'Model Serving NIM Account Enabled',
  REMOVED = 'Model Serving NIM Account Removed',
}

export enum NimAccountEnabledMode {
  ENABLE = 'enable',
  REPLACE = 'replace',
}

/**
 * Allowlisted, non-sensitive failure category for outcome-tracking `error` fields.
 * Raw `Error.message` values may contain credentials or internal paths and must not
 * be forwarded to analytics — detailed messages belong in UI only.
 */
export enum NimFailureCategory {
  API_FAILED = 'api_failed',
  VALIDATION_FAILED = 'validation_failed',
  DELETE_FAILED = 'delete_failed',
  DELETE_TIMEOUT = 'delete_timeout',
}

export type NimAccountEnabledProperties = {
  outcome: TrackingOutcome;
  success?: boolean;
  error?: NimFailureCategory;
  mode: NimAccountEnabledMode;
};

export type NimAccountRemovedProperties = {
  outcome: TrackingOutcome;
  success?: boolean;
  error?: NimFailureCategory;
};

export const fireNimAccountEnabled = (
  trackEvent: TrackEvent,
  properties: NimAccountEnabledProperties,
): void => {
  trackEvent(NimAccountTrackingEvent.ENABLED, properties);
};

export const fireNimAccountRemoved = (
  trackEvent: TrackEvent,
  properties: NimAccountRemovedProperties,
): void => {
  trackEvent(NimAccountTrackingEvent.REMOVED, properties);
};

export { TrackingOutcome };

import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core';

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

export const fireNimAccountEnabled = (properties: NimAccountEnabledProperties): void => {
  fireFormTrackingEvent(NimAccountTrackingEvent.ENABLED, properties);
};

export const fireNimAccountRemoved = (properties: NimAccountRemovedProperties): void => {
  fireFormTrackingEvent(NimAccountTrackingEvent.REMOVED, properties);
};

export { TrackingOutcome };

import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { type FormTrackingEventProperties } from '@odh-dashboard/ui-core';
import type { ServingRuntimeAPIProtocol } from '@odh-dashboard/model-serving/shared';

export enum ServingRuntimeTemplateTrackingEvent {
  CREATED = 'Model Serving Serving Runtime Template Created',
  UPDATED = 'Model Serving Serving Runtime Template Updated',
  DELETED = 'Model Serving Serving Runtime Template Deleted',
  ENABLEMENT_CHANGED = 'Model Serving Serving Runtime Template Enablement Changed',
}

export type ServingRuntimeTemplateCreatedProperties = FormTrackingEventProperties & {
  /** Whether the template was created from scratch or duplicated from an existing one. */
  mode: 'create' | 'duplicate';
  apiProtocol?: ServingRuntimeAPIProtocol;
  /** Comma-separated list of selected model type enum values (no free text). */
  modelTypes?: string;
};

export type ServingRuntimeTemplateUpdatedProperties = FormTrackingEventProperties & {
  apiProtocol?: ServingRuntimeAPIProtocol;
  /** Comma-separated list of selected model type enum values (no free text). */
  modelTypes?: string;
};

export type ServingRuntimeTemplateDeletedProperties = FormTrackingEventProperties;

export type ServingRuntimeTemplateEnablementChangedProperties = FormTrackingEventProperties & {
  /** The actual enabled state after the toggle attempt (reverts to the prior state on failure). */
  enabled: boolean;
};

export const fireServingRuntimeTemplateCreated = (
  properties: ServingRuntimeTemplateCreatedProperties,
): void => {
  fireFormTrackingEvent(ServingRuntimeTemplateTrackingEvent.CREATED, properties);
};

export const fireServingRuntimeTemplateUpdated = (
  properties: ServingRuntimeTemplateUpdatedProperties,
): void => {
  fireFormTrackingEvent(ServingRuntimeTemplateTrackingEvent.UPDATED, properties);
};

export const fireServingRuntimeTemplateDeleted = (
  properties: ServingRuntimeTemplateDeletedProperties,
): void => {
  fireFormTrackingEvent(ServingRuntimeTemplateTrackingEvent.DELETED, properties);
};

export const fireServingRuntimeTemplateEnablementChanged = (
  properties: ServingRuntimeTemplateEnablementChangedProperties,
): void => {
  fireFormTrackingEvent(ServingRuntimeTemplateTrackingEvent.ENABLEMENT_CHANGED, properties);
};

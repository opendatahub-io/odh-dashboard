import { type FormTrackingEventProperties } from '@odh-dashboard/ui-core';
import type { TrackEventFn } from '../../../shared/tracking/modelServingTrackingConstants';
import type { RuntimeImageInstallTargetId } from '../../../../extension-points/runtime-image-install-target';

export enum RuntimeImageInstallTrackingEvent {
  CREATE_STARTED = 'Runtime Image Library Create Started',
  CONFIGURATION_SELECTED = 'Runtime Image Library Configuration Selected',
  CREATE_COMPLETED = 'Runtime Image Library Create Completed',
}

export type CreateStartedProperties = {
  runtimeName: string;
  version: string;
  hardware: string;
};

export type ConfigurationType = 'serving-runtime-template' | 'llm-accelerator-configuration';

export type ConfigurationSelectedProperties = {
  configurationType: ConfigurationType;
};

export type CreateCompletedProperties = FormTrackingEventProperties & {
  configurationType: ConfigurationType;
};

/** Map internal target IDs to user-facing configuration type values. */
const TARGET_ID_TO_CONFIGURATION_TYPE: Record<RuntimeImageInstallTargetId, ConfigurationType> = {
  servingRuntimeTemplate: 'serving-runtime-template',
  llmInferenceServiceConfig: 'llm-accelerator-configuration',
};

export const toConfigurationType = (targetId: RuntimeImageInstallTargetId): ConfigurationType =>
  TARGET_ID_TO_CONFIGURATION_TYPE[targetId];

export const fireCreateStarted = (
  trackEvent: TrackEventFn,
  properties: CreateStartedProperties,
): void => {
  trackEvent(RuntimeImageInstallTrackingEvent.CREATE_STARTED, properties);
};

export const fireConfigurationSelected = (
  trackEvent: TrackEventFn,
  properties: ConfigurationSelectedProperties,
): void => {
  trackEvent(RuntimeImageInstallTrackingEvent.CONFIGURATION_SELECTED, properties);
};

export const fireCreateCompleted = (
  trackEvent: TrackEventFn,
  properties: CreateCompletedProperties,
): void => {
  trackEvent(RuntimeImageInstallTrackingEvent.CREATE_COMPLETED, properties);
};

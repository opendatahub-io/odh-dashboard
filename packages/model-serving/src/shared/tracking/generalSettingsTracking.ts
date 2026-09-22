import { type FormTrackingEventProperties } from '@odh-dashboard/ui-core';
import type { TrackEventFn } from './modelServingTrackingConstants';
import type { DeploymentStrategy } from '../../components/settings/DeploymentStrategySettings';

export enum GeneralSettingsTrackingEvent {
  PLATFORM_SETTING_CHANGED = 'Model Serving Platform Setting Changed',
  DEPLOYMENT_STRATEGY_CHANGED = 'Model Serving Deployment Strategy Changed',
}

/** The persisted platform toggles on the General settings tab. */
export type PlatformSetting =
  | 'model_serving_enabled'
  | 'llmd_enabled'
  | 'llmd_default_for_generative';

export type PlatformSettingChangedProperties = FormTrackingEventProperties & {
  setting: PlatformSetting;
  /** The new boolean value the setting was saved with. */
  enabled: boolean;
};

export type DeploymentStrategyChangedProperties = FormTrackingEventProperties & {
  strategy: DeploymentStrategy;
};

export const firePlatformSettingChanged = (
  trackEvent: TrackEventFn,
  properties: PlatformSettingChangedProperties,
): void => {
  trackEvent(GeneralSettingsTrackingEvent.PLATFORM_SETTING_CHANGED, properties);
};

export const fireDeploymentStrategyChanged = (
  trackEvent: TrackEventFn,
  properties: DeploymentStrategyChangedProperties,
): void => {
  trackEvent(GeneralSettingsTrackingEvent.DEPLOYMENT_STRATEGY_CHANGED, properties);
};

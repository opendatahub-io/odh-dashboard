import { type FormTrackingEventProperties } from '@odh-dashboard/ui-core';
import type { TrackEventFn } from './modelServingTrackingConstants';

export enum DeploymentTrackingEvent {
  MODEL_DEPLOYED = 'Model Deployed',
  MODEL_UPDATED = 'Model Updated',
}

export type DeploymentTrackingBaseProperties = FormTrackingEventProperties & {
  modelType?: string;
  runtime?: string;
  servingRuntimeName?: string;
  servingRuntimeFormat?: string;
  numReplicas?: number;
  modelLocationType?: string;
};

export type DeploymentTrackingProperties = DeploymentTrackingBaseProperties &
  Record<string, string | number | boolean | undefined>;

export const fireModelDeployed = (
  trackEvent: TrackEventFn,
  properties: DeploymentTrackingProperties,
  isEdit?: boolean,
): void => {
  const eventName = isEdit
    ? DeploymentTrackingEvent.MODEL_UPDATED
    : DeploymentTrackingEvent.MODEL_DEPLOYED;
  trackEvent(eventName, properties);
};

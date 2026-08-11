import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { type FormTrackingEventProperties } from '@odh-dashboard/ui-core';

export enum DeploymentTrackingEvent {
  MODEL_DEPLOYED = 'Model Deployed',
  MODEL_UPDATED = 'Model Updated',
}

export type DeploymentTrackingBaseProperties = FormTrackingEventProperties & {
  type?: string;
  runtime?: string;
  servingRuntimeName?: string;
  servingRuntimeFormat?: string;
  numReplicas?: number;
};

export type DeploymentTrackingProperties = DeploymentTrackingBaseProperties;

export const fireModelDeployed = (
  properties: DeploymentTrackingProperties,
  isEdit?: boolean,
): void => {
  const eventName = isEdit
    ? DeploymentTrackingEvent.MODEL_UPDATED
    : DeploymentTrackingEvent.MODEL_DEPLOYED;
  fireFormTrackingEvent(eventName, properties);
};

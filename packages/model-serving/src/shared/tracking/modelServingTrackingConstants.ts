import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';

export type TrackEventFn = (
  eventName: string,
  properties: Record<string, string | number | boolean | string[] | undefined>,
) => void;

export enum ModelServingTrackingEvent {
  DEPLOY_METHOD_SELECTED = 'Model Serving Deploy Method Selected',
  CAPABILITY_ADDED = 'Deployment Capability Added',
  CAPABILITY_REMOVED = 'Deployment Capability Removed',
  CAPABILITY_MENU_OPENED = 'Deployment Capability Menu Opened',
  DEPLOY_WIZARD_STARTED = 'Model Serving Deploy Wizard Started',
  VALIDATED_ARGUMENT_SELECTED = 'Model Serving Validated Argument Selected',
  VALIDATED_ARGUMENTS_VIEWED = 'Model Serving Validated Arguments Viewed',
  MODEL_DEPLOYED = 'Model Deployed',
}

export type DeployMethodSelectedProperties = {
  deploymentMethod: string;
  previousDeploymentMethod?: string;
};

export const fireDeployMethodSelected = (properties: DeployMethodSelectedProperties): void => {
  fireMiscTrackingEvent(ModelServingTrackingEvent.DEPLOY_METHOD_SELECTED, properties);
};

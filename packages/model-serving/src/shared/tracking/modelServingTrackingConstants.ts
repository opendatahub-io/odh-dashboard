export type TrackEventFn = (
  eventName: string,
  properties: Record<string, string | number | boolean | undefined>,
) => void;

export enum ModelServingTrackingEvent {
  DEPLOY_METHOD_SELECTED = 'Model Serving Deploy Method Selected',
  CAPABILITY_ADDED = 'Deployment Capability Added',
  CAPABILITY_REMOVED = 'Deployment Capability Removed',
  CAPABILITY_MENU_OPENED = 'Deployment Capability Menu Opened',
}

export type DeployMethodSelectedProperties = {
  deploymentMethod: string;
  previousDeploymentMethod?: string;
};

export const fireDeployMethodSelected = (
  trackEvent: TrackEventFn,
  properties: DeployMethodSelectedProperties,
): void => {
  trackEvent(ModelServingTrackingEvent.DEPLOY_METHOD_SELECTED, properties);
};

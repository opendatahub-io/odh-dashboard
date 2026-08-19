export type TrackEventFn = (
  eventName: string,
  properties: Record<string, string | number | boolean | undefined>,
) => void;

export enum ModelServingTrackingEvent {
  DEPLOY_METHOD_SELECTED = 'Model Serving Deploy Method Selected',
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

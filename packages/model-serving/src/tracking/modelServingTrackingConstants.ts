import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';

export enum ModelServingTrackingEvent {
  DEPLOY_METHOD_SELECTED = 'Model Serving Deploy Method Selected',
}

export type DeployMethodSelectedProperties = {
  deploymentMethod: string;
  previousDeploymentMethod?: string;
};

export const fireDeployMethodSelected = (properties: DeployMethodSelectedProperties): void => {
  fireMiscTrackingEvent(ModelServingTrackingEvent.DEPLOY_METHOD_SELECTED, properties);
};

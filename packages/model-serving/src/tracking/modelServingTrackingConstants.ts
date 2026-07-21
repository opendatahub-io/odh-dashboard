import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';

export const MODEL_SERVING_EVENTS = {
  DEPLOY_METHOD_SELECTED: 'Model Serving Deploy Method Selected',
} as const;

export type DeployMethodSelectedProperties = {
  deploymentMethod: string;
  previousDeploymentMethod?: string;
};

export const fireDeployMethodSelected = (properties: DeployMethodSelectedProperties): void => {
  fireMiscTrackingEvent(MODEL_SERVING_EVENTS.DEPLOY_METHOD_SELECTED, properties);
};

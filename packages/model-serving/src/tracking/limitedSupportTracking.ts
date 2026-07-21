import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  getServingRuntimeVersion,
  getFastVersion,
} from '@odh-dashboard/model-serving/concepts/versions';

export const LIMITED_SUPPORT_EVENTS = {
  RISK_DISMISSED: 'Model Serving Unsupported Runtime Risk Dismissed',
} as const;

export type RuntimeResourceType = 'serving-runtime-template' | 'llm-accelerator-config';

export type DismissAction = 'cancel' | 'close';

export type RiskDismissedProperties = {
  runtimeResourceType: RuntimeResourceType;
  resourceId: string;
  resourceName: string;
  version: string | undefined;
  fastVersion: string | undefined;
  dismissAction: DismissAction;
  outcome: 'cancel';
};

export const getResourceVersions = (
  resource: K8sResourceCommon,
): { version: string | undefined; fastVersion: string | undefined } => ({
  version: getServingRuntimeVersion(resource),
  fastVersion: getFastVersion(resource),
});

export const fireRiskDismissed = (properties: RiskDismissedProperties): void => {
  fireMiscTrackingEvent(LIMITED_SUPPORT_EVENTS.RISK_DISMISSED, properties);
};

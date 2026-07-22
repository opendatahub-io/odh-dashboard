import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  getServingRuntimeVersion,
  getFastVersion,
} from '@odh-dashboard/model-serving/concepts/versions';
import type { UnsupportedStatusDismissAction } from '@odh-dashboard/model-serving/components/UnsupportedStatusAcceptanceModal';

export enum LimitedSupportEvent {
  RISK_ACCEPTED = 'Model Serving Unsupported Runtime Risk Accepted',
  RISK_DISMISSED = 'Model Serving Unsupported Runtime Risk Dismissed',
}

export type RuntimeResourceType = 'serving-runtime-template' | 'llm-accelerator-config';

type CommonResourceProperties = {
  runtimeResourceType: RuntimeResourceType;
  resourceId: string;
  resourceName: string;
  version: string | undefined;
  fastVersion: string | undefined;
};

export type RiskAcceptedProperties = CommonResourceProperties & {
  outcome: 'submit';
  success: true;
};

export type RiskDismissedProperties = CommonResourceProperties & {
  dismissAction: UnsupportedStatusDismissAction;
  outcome: 'cancel';
};

export const getResourceVersions = (
  resource: K8sResourceCommon,
): { version: string | undefined; fastVersion: string | undefined } => ({
  version: getServingRuntimeVersion(resource),
  fastVersion: getFastVersion(resource),
});

export const fireRiskAccepted = (properties: RiskAcceptedProperties): void => {
  fireMiscTrackingEvent(LimitedSupportEvent.RISK_ACCEPTED, properties);
};

export const fireRiskDismissed = (properties: RiskDismissedProperties): void => {
  fireMiscTrackingEvent(LimitedSupportEvent.RISK_DISMISSED, properties);
};

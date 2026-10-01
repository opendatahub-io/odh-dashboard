import { type FormTrackingEventProperties } from '@odh-dashboard/ui-core';
import {
  getKueueAnalyticsSubState,
  type KueueSubState,
} from '@odh-dashboard/k8s-core/kueue/messageUtils';
import { KUEUE_STATUSES_OVERRIDE_MODEL_DEPLOYMENT } from '@odh-dashboard/k8s-core/kueue/types';
import { KUEUE_QUEUE_LABEL } from '@odh-dashboard/k8s-core/kueue/workloadStatus';
import type { TrackEventFn } from './modelServingTrackingConstants';
import type { Deployment } from '../../../extension-points';

export enum DeploymentTrackingEvent {
  MODEL_DEPLOYED = 'Model Deployed',
  MODEL_UPDATED = 'Model Updated',
  STATUS_LOG_VIEWED = 'Model Deploying Status Log Viewed',
  STATUS_PROGRESS_TAB_SELECTED = 'Model Deploying Status Progress Tab Selected',
  STATUS_RESOURCES_TAB_SELECTED = 'Model Deploying Status Resources Tab Selected',
  STATUS_MODAL_ACTION_CLICKED = 'Model Deploying Status Modal Action Clicked',
}

export type DeploymentKind = 'inferenceService' | 'llmInferenceService';

export type DeploymentStatusTab = 'progress' | 'resources';

export type DeploymentStatusModalAction = 'edit' | 'stop' | 'start' | 'close';

export type DeploymentKueueTrackingProperties = {
  kueueSubState: KueueSubState;
  isKueueBlocking: boolean;
  kueueQueueName?: string;
  hasKueueEnabled: boolean;
  primaryDeploymentStatus: string;
  admittedReplicaCount: number;
  deploymentKind?: DeploymentKind;
  numReplicas?: number;
};

export type DeploymentTrackingBaseProperties = FormTrackingEventProperties & {
  modelType?: string;
  runtime?: string;
  servingRuntimeName?: string;
  servingRuntimeFormat?: string;
  numReplicas?: number;
  modelLocationType?: string;
  kueueSubState?: KueueSubState;
  isKueueBlocking?: boolean;
  kueueQueueName?: string;
  hasKueueEnabled?: boolean;
  primaryDeploymentStatus?: string;
  admittedReplicaCount?: number;
  deploymentKind?: DeploymentKind;
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

export const getDeploymentKind = (deployment: Deployment): DeploymentKind | undefined => {
  if (deployment.model.kind === 'InferenceService') {
    return 'inferenceService';
  }
  if (deployment.model.kind === 'LLMInferenceService') {
    return 'llmInferenceService';
  }
  return undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getDeploymentReplicaCount = (deployment: Deployment): number | undefined => {
  const { model } = deployment;
  if (!('spec' in model) || !isRecord(model.spec)) {
    return undefined;
  }
  const replicaCount = typeof model.spec.replicas === 'number' ? model.spec.replicas : undefined;
  const predictor = isRecord(model.spec.predictor) ? model.spec.predictor : undefined;
  const minReplicas =
    typeof predictor?.minReplicas === 'number' ? predictor.minReplicas : undefined;
  return replicaCount ?? minReplicas;
};

export const getDeploymentKueueTrackingProperties = (
  deployment: Deployment,
): DeploymentKueueTrackingProperties => {
  const kueueStatus = deployment.status?.kueueStatus;
  const kueueQueueName =
    kueueStatus?.queueName ?? deployment.model.metadata.labels?.[KUEUE_QUEUE_LABEL];
  const isKueueBlocking = Boolean(
    kueueStatus?.status && KUEUE_STATUSES_OVERRIDE_MODEL_DEPLOYMENT.includes(kueueStatus.status),
  );

  return {
    kueueSubState: getKueueAnalyticsSubState(kueueStatus),
    isKueueBlocking,
    ...(kueueQueueName && { kueueQueueName }),
    hasKueueEnabled: Boolean(kueueStatus || kueueQueueName),
    primaryDeploymentStatus: deployment.status?.state ?? 'Unknown',
    admittedReplicaCount: kueueStatus?.podAdmissionCounts?.admitted ?? 0,
    deploymentKind: getDeploymentKind(deployment),
    numReplicas: getDeploymentReplicaCount(deployment),
  };
};

export const fireDeploymentStatusEvent = (
  trackEvent: TrackEventFn,
  event: DeploymentTrackingEvent,
  deployment: Deployment,
  properties: Record<string, string | number | boolean | undefined> = {},
): void => {
  try {
    trackEvent(event, {
      ...getDeploymentKueueTrackingProperties(deployment),
      ...properties,
    });
  } catch {
    // Analytics must never block the user interaction being tracked.
  }
};

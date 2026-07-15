import type { PodKind } from '@odh-dashboard/k8s-core';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import {
  checkModelPodStatus,
  getInferenceServiceModelState,
  getInferenceServiceStatusMessage,
  ModelDeploymentState,
} from '@odh-dashboard/model-serving/shared';
import type {
  DeploymentCondition,
  DeploymentStatus,
} from '@odh-dashboard/model-serving/extension-points';
import { toConditionStatus } from '@odh-dashboard/model-serving/extension-points';
import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { InferenceServiceModel } from '@odh-dashboard/internal/api/models/kserve';
import { getModelDeploymentStoppedStates } from '@odh-dashboard/model-serving/utils';
import { KServeDeployment } from './deployments';

export const patchDeploymentStoppedStatus = (
  deployment: KServeDeployment,
  isStopped: boolean,
): Promise<KServeDeployment['model']> =>
  k8sPatchResource({
    model: InferenceServiceModel,
    queryOptions: {
      name: deployment.model.metadata.name,
      ns: deployment.model.metadata.namespace,
    },
    patches: [
      {
        op: 'add',
        path: '/metadata/annotations/serving.kserve.io~1stop',
        value: isStopped ? 'true' : 'false',
      },
    ],
  });

const KSERVE_CONDITION_LABELS: Record<string, string> = {
  PredictorReady: 'Predictor ready',
  IngressReady: 'Ingress ready',
  LatestDeploymentReady: 'Deployment ready',
};

const KSERVE_CONDITION_ORDER = ['PredictorReady', 'IngressReady', 'LatestDeploymentReady'];

export const getKServeDeploymentConditions = (
  inferenceService: InferenceServiceKind,
  deploymentState: ModelDeploymentState,
): DeploymentCondition[] => {
  const rawConditions = inferenceService.status?.conditions ?? [];
  const isModelServing = deploymentState === ModelDeploymentState.LOADED;

  const conditions: DeploymentCondition[] = [
    {
      type: 'DeploymentRequested',
      label: 'Deployment requested',
      status: 'True',
      lastTransitionTime: inferenceService.metadata.creationTimestamp,
    },
  ];

  const stoppedCondition = rawConditions.find((c) => c.type === 'Stopped' && c.status === 'True');

  for (const type of KSERVE_CONDITION_ORDER) {
    const raw = rawConditions.find((c) => c.type === type);
    if (!raw) {
      continue;
    }
    if (raw.reason === 'Stopped' && raw.type !== 'Stopped') {
      continue;
    }

    const isFalse = raw.status === 'False';
    const isWarning = isFalse && isModelServing && type === 'LatestDeploymentReady';

    conditions.push({
      type: raw.type,
      label: isWarning
        ? 'Deployment ready (update available)'
        : KSERVE_CONDITION_LABELS[raw.type] ?? raw.type,
      status: isWarning ? 'Warning' : toConditionStatus(raw.status),
      reason: raw.reason,
      message: isFalse ? raw.message : undefined,
      lastTransitionTime: raw.lastTransitionTime,
    });
  }

  if (stoppedCondition) {
    conditions.push({
      type: 'Stopped',
      label: 'Deployment stopped',
      status: 'True',
      reason: stoppedCondition.reason,
      message: stoppedCondition.message,
      lastTransitionTime: stoppedCondition.lastTransitionTime,
    });
  }

  return conditions;
};

export const getKServeDeploymentStatus = (
  inferenceService: InferenceServiceKind,
  deploymentPods: PodKind[],
): DeploymentStatus => {
  const deploymentPod = deploymentPods.find(
    (pod) =>
      pod.metadata.labels?.['serving.kserve.io/inferenceservice'] ===
      inferenceService.metadata.name,
  );
  const modelPodStatus = deploymentPod ? checkModelPodStatus(deploymentPod) : null;

  const state = getInferenceServiceModelState(inferenceService, modelPodStatus);
  const message = getInferenceServiceStatusMessage(inferenceService, modelPodStatus);

  const stoppedStates = getModelDeploymentStoppedStates(
    state,
    inferenceService.metadata.annotations,
    deploymentPod,
  );

  const conditions = getKServeDeploymentConditions(inferenceService, state);

  return { state, message, stoppedStates, conditions };
};

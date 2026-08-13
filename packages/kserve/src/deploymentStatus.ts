import type { PodKind } from '@odh-dashboard/k8s-core';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import { KUEUE_STATUSES_PAST_ADMISSION } from '@odh-dashboard/internal/concepts/kueue/types';
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
import { getKueueSchedulingSubStep } from '@odh-dashboard/internal/concepts/kueue/index';
import type { KueueWorkloadStatusWithMessage } from '@odh-dashboard/internal/concepts/kueue/types';
import { KServeDeployment } from './types';

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
  kueueStatus?: KueueWorkloadStatusWithMessage | null,
): DeploymentCondition[] => {
  const rawConditions = inferenceService.status?.conditions ?? [];
  const isModelServing = deploymentState === ModelDeploymentState.LOADED;

  // "Create pod" needs a real "the pod is up" signal. Rather than cross-referencing a separate
  // pod watch (fragile for multi-replica: has to require *every* pod scheduled, not just one,
  // and duplicates correlation logic that already exists for the Kueue watch), use Kueue's own
  // Workload conditions directly. `kueueStatus` is already the worst-of-all-Workloads aggregate
  // (see aggregateKueueStatusForModel), so once it reaches Admitted or later (quota reserved,
  // Kueue's scheduling gate lifted for every replica) the pod creation step Kueue was gating is
  // done — normal k8s scheduling takes over from there. Statuses before that
  // (Queued/Inadmissible/Preempted/Evicted/Requeued/BlockedOnPreemptionGates/Failed) mean at
  // least one replica is still blocked, so keep showing the Kueue sub-step.
  const isPastAdmission = Boolean(
    kueueStatus?.status && KUEUE_STATUSES_PAST_ADMISSION.includes(kueueStatus.status),
  );
  const kueueSubStep =
    kueueStatus?.status && !isPastAdmission ? getKueueSchedulingSubStep(kueueStatus) : null;

  const conditions: DeploymentCondition[] = [
    {
      type: 'DeploymentRequested',
      label: 'Deployment requested',
      status: 'True',
      lastTransitionTime: inferenceService.metadata.creationTimestamp,
    },
  ];

  if (kueueStatus) {
    // Once past admission, clear the Kueue message entirely rather than pairing a green
    // checkmark with a stale "Admitted to queue"/"Queued" label underneath it.
    conditions.push({
      type: 'CreatePod',
      label: 'Create pod',
      status: isPastAdmission ? 'True' : kueueSubStep ? kueueSubStep.messageStatus : 'Unknown',
      messageStatus: isPastAdmission ? undefined : kueueSubStep?.messageStatus,
      inProgress:
        !isPastAdmission && (kueueSubStep ? kueueSubStep.messageStatus === 'Unknown' : true),
      message: isPastAdmission ? undefined : kueueSubStep?.label,
      lastTransitionTime: kueueSubStep?.lastTransitionTime ?? kueueStatus.timestamp,
    });
  }

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
  kueueStatus?: KueueWorkloadStatusWithMessage | null,
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

  const conditions = getKServeDeploymentConditions(inferenceService, state, kueueStatus);

  return { state, message, stoppedStates, conditions, kueueStatus };
};

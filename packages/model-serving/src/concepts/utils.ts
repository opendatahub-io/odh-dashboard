import type { ToggleState } from '@odh-dashboard/ui-core';
import type { PodKind } from '@odh-dashboard/k8s-core';
import {
  KUEUE_STATUSES_OVERRIDE_MODEL_DEPLOYMENT,
  type KueueWorkloadStatusWithMessage,
} from '@odh-dashboard/k8s-core/kueue/types';
import { ModelDeploymentState } from '@odh-dashboard/model-serving/shared';

const isKueuePreAdmissionBlocking = (
  isStopAnnotated: boolean,
  kueueStatus?: KueueWorkloadStatusWithMessage | null,
): boolean =>
  !isStopAnnotated &&
  Boolean(
    kueueStatus?.status && KUEUE_STATUSES_OVERRIDE_MODEL_DEPLOYMENT.includes(kueueStatus.status),
  );

export const getModelDeploymentStoppedStates = (
  state: ModelDeploymentState,
  modelAnnotations?: Record<string, string>,
  deploymentPod?: PodKind,
  kueueStatus?: KueueWorkloadStatusWithMessage | null,
): ToggleState => {
  const isStopAnnotated = isModelServingStopped(modelAnnotations);
  const isKueuePreAdmission = isKueuePreAdmissionBlocking(isStopAnnotated, kueueStatus);
  const baseIsRunning =
    (state === ModelDeploymentState.LOADED || state === ModelDeploymentState.FAILED_TO_LOAD) &&
    !isStopAnnotated;
  const baseIsStarting =
    (state === ModelDeploymentState.PENDING ||
      state === ModelDeploymentState.LOADING ||
      state === ModelDeploymentState.STANDBY ||
      state === ModelDeploymentState.UNKNOWN) &&
    !isStopAnnotated;

  return {
    // ISVC doesn't have annotation and state is LOADED
    isRunning: baseIsRunning && !isKueuePreAdmission,
    // ISVC has annotation and there are no pods
    isStopped: isStopAnnotated && !deploymentPod,
    // ISVC doesn't have annotation and state is PENDING, LOADING, STANDBY or UNKNOWN,
    // or Kueue is still gating admission after a restart (stale LOADED + Queued Workload).
    isStarting: baseIsStarting || isKueuePreAdmission,
    // ISVC has annotation and there are pods
    isStopping: isStopAnnotated && !!deploymentPod,
  };
};

export const isModelServingStopped = (modelAnnotations?: Record<string, string>): boolean =>
  modelAnnotations?.['serving.kserve.io/stop'] === 'true';

import type { PodKind } from '@odh-dashboard/k8s-core';
import { asEnumMember } from './enumUtils';
import { ModelDeploymentState, type InferenceServiceKind, type ModelStatus } from '../types';

export const getInferenceServiceModelState = (
  is: InferenceServiceKind,
  podStatus?: ModelStatus | null,
): ModelDeploymentState => {
  if (podStatus?.failedToSchedule) {
    return ModelDeploymentState.FAILED_TO_LOAD;
  }
  return (
    asEnumMember(is.status?.modelStatus?.states?.targetModelState, ModelDeploymentState) ||
    asEnumMember(is.status?.modelStatus?.states?.activeModelState, ModelDeploymentState) ||
    ModelDeploymentState.UNKNOWN
  );
};

export const getInferenceServiceLastFailureReason = (is: InferenceServiceKind): string =>
  is.status?.modelStatus?.lastFailureInfo?.reason ||
  is.status?.modelStatus?.lastFailureInfo?.message ||
  'Unknown';

export const getInferenceServiceStatusMessage = (
  is: InferenceServiceKind,
  podStatus?: ModelStatus | null,
): string => {
  if (podStatus?.failedToSchedule) {
    return podStatus.failureMessage || 'Insufficient resources';
  }
  const activeModelState = is.status?.modelStatus?.states?.activeModelState;
  const targetModelState = is.status?.modelStatus?.states?.targetModelState;

  const stateMessage = (targetModelState || activeModelState) ?? 'Unknown';

  if (
    activeModelState === ModelDeploymentState.FAILED_TO_LOAD ||
    targetModelState === ModelDeploymentState.FAILED_TO_LOAD
  ) {
    const lastFailureMessage = is.status?.modelStatus?.lastFailureInfo?.message;
    return lastFailureMessage || stateMessage;
  }

  if (
    activeModelState === ModelDeploymentState.LOADED &&
    (targetModelState === ModelDeploymentState.LOADING ||
      targetModelState === ModelDeploymentState.PENDING)
  ) {
    return 'Redeploying';
  }

  return stateMessage;
};

export const checkModelPodStatus = (model?: PodKind): ModelStatus => {
  const conditions = model?.status?.conditions ?? [];
  const unschedulableCondition = conditions.find(
    (condition) => condition.reason === 'Unschedulable',
  );

  const failedToSchedule = model?.status?.phase === 'Pending' && !!unschedulableCondition;

  return {
    failedToSchedule,
    failureMessage: failedToSchedule ? unschedulableCondition.message || null : null,
  };
};

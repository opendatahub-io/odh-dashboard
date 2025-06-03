import { InferenceServiceKind, PodKind } from '#~/k8sTypes';
import { InferenceServiceModelState, ModelStatus } from '#~/pages/modelServing/screens/types';
import { asEnumMember } from '#~/utilities/utils';

/**
 * Get the model state of an InferenceService.
 * It prioritizes the targetModelState, then activeModelState, and defaults to UNKNOWN.
 * If the pod associated with the InferenceService failed to schedule, it returns FAILED_TO_LOAD.
 *
 * @param is The InferenceService custom resource.
 * @param podStatus Optional status of the pod associated with the model.
 * @returns The state of the model.
 */
export const getInferenceServiceModelState = (
  is: InferenceServiceKind,
  podStatus?: ModelStatus | null,
): InferenceServiceModelState => {
  if (podStatus?.failedToSchedule) {
    return InferenceServiceModelState.FAILED_TO_LOAD;
  }
  return (
    asEnumMember(is.status?.modelStatus?.states?.targetModelState, InferenceServiceModelState) ||
    asEnumMember(is.status?.modelStatus?.states?.activeModelState, InferenceServiceModelState) ||
    InferenceServiceModelState.UNKNOWN
  );
};

/**
 * Get the last failure reason for an InferenceService.
 * It checks for a reason first, then a message, and defaults to 'Unknown'.
 *
 * @param is The InferenceService custom resource.
 * @returns The last failure reason string.
 */
export const getInferenceServiceLastFailureReason = (is: InferenceServiceKind): string =>
  is.status?.modelStatus?.lastFailureInfo?.reason ||
  is.status?.modelStatus?.lastFailureInfo?.message ||
  'Unknown';

/**
 * Get a status message for an InferenceService.
 * This message provides more context than just the model state.
 * For example, it can indicate if the model is redeploying or if there were resource issues.
 *
 * @param is The InferenceService custom resource.
 * @param podStatus Optional status of the pod associated with the model.
 * @returns A descriptive status message.
 */
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
    activeModelState === InferenceServiceModelState.FAILED_TO_LOAD ||
    targetModelState === InferenceServiceModelState.FAILED_TO_LOAD
  ) {
    const lastFailureMessage = is.status?.modelStatus?.lastFailureInfo?.message;
    return lastFailureMessage || stateMessage;
  }

  if (
    activeModelState === InferenceServiceModelState.LOADED &&
    (targetModelState === InferenceServiceModelState.LOADING ||
      targetModelState === InferenceServiceModelState.PENDING)
  ) {
    return 'Redeploying';
  }

  return stateMessage;
};

/**
 * Check the status of a model's pod, specifically if it failed to schedule.
 *
 * @param model The Pod custom resource.
 * @returns An object indicating if the pod failed to schedule and a failure message if applicable.
 */
export const checkModelPodStatus = (model: PodKind): ModelStatus => {
  const unschedulableCondition = model.status?.conditions.find(
    (condition) => condition.reason === 'Unschedulable',
  );

  const failedToSchedule = model.status?.phase === 'Pending' && !!unschedulableCondition;

  return {
    failedToSchedule,
    failureMessage: failedToSchedule ? unschedulableCondition.message || null : null,
  };
};

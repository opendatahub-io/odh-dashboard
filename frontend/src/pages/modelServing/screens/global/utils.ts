import { InferenceServiceKind, ProjectKind, PodKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { InferenceServiceModelState, ModelStatus } from '~/pages/modelServing/screens/types';
import { asEnumMember } from '~/utilities/utils';

export const getInferenceServiceModelState = (
  is: InferenceServiceKind,
): InferenceServiceModelState =>
  asEnumMember(is.status?.modelStatus?.states?.targetModelState, InferenceServiceModelState) ||
  asEnumMember(is.status?.modelStatus?.states?.activeModelState, InferenceServiceModelState) ||
  InferenceServiceModelState.UNKNOWN;

export const getInferenceServiceLastFailureReason = (is: InferenceServiceKind): string =>
  is.status?.modelStatus?.lastFailureInfo?.reason ||
  is.status?.modelStatus?.lastFailureInfo?.message ||
  'Unknown';

export const getInferenceServiceStatusMessage = (is: InferenceServiceKind): string => {
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

export const getInferenceServiceProjectDisplayName = (
  is: InferenceServiceKind,
  projects: ProjectKind[],
): string => {
  const project = projects.find(({ metadata: { name } }) => name === is.metadata.namespace);
  return project ? getDisplayNameFromK8sResource(project) : 'Unknown';
};

export const checkModelStatus = (model: PodKind): ModelStatus => {
  const unschedulableCondition = model.status?.conditions.find(
    (condition) => condition.reason === 'Unschedulable',
  );

  const failedToSchedule = model.status?.phase === 'Pending' && !!unschedulableCondition;

  return {
    failedToSchedule,
    failureMessage: failedToSchedule ? unschedulableCondition.message || null : null,
  };
};

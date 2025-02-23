import { InferenceServiceKind, ProjectKind, PodKind, ServingRuntimeKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { InferenceServiceModelState, ModelStatus } from '~/pages/modelServing/screens/types';
import { asEnumMember } from '~/utilities/utils';
import { getDisplayNameFromServingRuntimeTemplate } from '~/pages/modelServing/customServingRuntimes/utils';

export const getInferenceServiceModelState = (
  is: InferenceServiceKind,
): InferenceServiceModelState =>
  asEnumMember(is.status?.modelStatus?.states?.targetModelState, InferenceServiceModelState) ||
  asEnumMember(is.status?.modelStatus?.states?.activeModelState, InferenceServiceModelState) ||
  InferenceServiceModelState.UNKNOWN;

export const getInferenceServiceStatusMessage = (
  is: InferenceServiceKind,
  ServingRuntime?: ServingRuntimeKind,
  isNIMAvailable?: boolean,
): string => {
  const isNIMModel =
    ServingRuntime && getDisplayNameFromServingRuntimeTemplate(ServingRuntime) === 'NVIDIA NIM';
  const activeModelState = is.status?.modelStatus?.states?.activeModelState;
  const targetModelState = is.status?.modelStatus?.states?.targetModelState;

  const stateMessage = (targetModelState || activeModelState) ?? 'Unknown';
  if (
    activeModelState === InferenceServiceModelState.FAILED_TO_LOAD ||
    targetModelState === InferenceServiceModelState.FAILED_TO_LOAD
  ) {
    if (isNIMModel && !isNIMAvailable) {
      return 'Model failed to load due to disabled NIM or invalid API key.';
    }
    const lastFailureMessage = is.status?.modelStatus?.lastFailureInfo?.message;
    return lastFailureMessage || stateMessage;
  }

  if (
    activeModelState === InferenceServiceModelState.LOADED &&
    (targetModelState === InferenceServiceModelState.LOADING ||
      targetModelState === InferenceServiceModelState.PENDING)
  ) {
    return isNIMModel && !isNIMAvailable
      ? 'Model is pending due to disabled NIM or invalid API key.'
      : 'Redeploying';
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
  const modelStatus = !!model.status?.conditions.some(
    (currentModel) => currentModel.reason === 'Unschedulable',
  );
  return {
    failedToSchedule: model.status?.phase === 'Pending' && modelStatus,
  };
};

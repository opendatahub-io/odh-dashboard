import { InferenceServiceKind, ProjectKind, SecretKind, PodKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { getProjectDisplayName } from '~/concepts/projects/utils';
import { InferenceServiceModelState, ModelStatus } from '~/pages/modelServing/screens/types';

export const getInferenceServiceDisplayName = (is: InferenceServiceKind): string =>
  getDisplayNameFromK8sResource(is);

export const getTokenDisplayName = (secret: SecretKind): string =>
  getDisplayNameFromK8sResource(secret);

export const getInferenceServiceActiveModelState = (
  is: InferenceServiceKind,
): InferenceServiceModelState =>
  <InferenceServiceModelState | undefined>is.status?.modelStatus.states.activeModelState ||
  <InferenceServiceModelState | undefined>is.status?.modelStatus.states.targetModelState ||
  InferenceServiceModelState.UNKNOWN;

export const getInferenceServiceStatusMessage = (is: InferenceServiceKind): string => {
  const activeModelState = is.status?.modelStatus.states.activeModelState;
  const targetModelState = is.status?.modelStatus.states.targetModelState;

  const failedToLoad = InferenceServiceModelState.FAILED_TO_LOAD;
  const isFailedToLoad = activeModelState === failedToLoad || targetModelState === failedToLoad;

  const lastFailureMessage = is.status?.modelStatus.lastFailureInfo?.message;
  const stateMessage = activeModelState ?? targetModelState ?? 'Unknown';

  return isFailedToLoad ? lastFailureMessage ?? stateMessage : stateMessage;
};

export const getInferenceServiceProjectDisplayName = (
  is: InferenceServiceKind,
  projects: ProjectKind[],
): string => {
  const project = projects.find(({ metadata: { name } }) => name === is.metadata.namespace);
  return project ? getProjectDisplayName(project) : 'Unknown';
};

export const checkModelStatus = (model: PodKind): ModelStatus => {
  const modelStatus = !!model.status?.conditions.some(
    (currentModel) => currentModel.reason === 'Unschedulable',
  );
  return {
    failedToSchedule: model.status?.phase === 'Pending' && modelStatus,
  };
};

import { InferenceServiceKind, ProjectKind, SecretKind, PodKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource, getProjectDisplayName } from '~/pages/projects/utils';
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

export const getInferenceServiceStatusMessage = (is: InferenceServiceKind): string =>
  is.status?.modelStatus.states.activeModelState ||
  is.status?.modelStatus.lastFailureInfo?.message ||
  'Unknown';

export const getInferenceServiceProjectDisplayName = (
  is: InferenceServiceKind,
  projects: ProjectKind[],
): string => {
  const project = projects.find(({ metadata: { name } }) => name === is.metadata.namespace);
  return project ? getProjectDisplayName(project) : 'Unknown';
};

export const checkModelStatus = (model: PodKind): ModelStatus => {
  const modelStatus = model.status.conditions.some(
    (currentModel) => currentModel.reason === 'Unschedulable',
  );
  return {
    failedToSchedule: model.status.phase === 'Pending' && modelStatus,
  };
};

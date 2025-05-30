import { InferenceServiceKind, PodKind } from '@odh-dashboard/internal/k8sTypes';
import {
  checkModelStatus,
  getInferenceServiceModelState,
  getInferenceServiceStatusMessage,
} from '@odh-dashboard/internal/concepts/modelServingKServe/kserveStatusUtils';
import { InferenceServiceModelState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { DeploymentStatus } from '@odh-dashboard/model-serving/extension-points';

export const getKServeDeploymentStatus = (
  inferenceService: InferenceServiceKind,
  deploymentPods: PodKind[],
): DeploymentStatus => {
  const deploymentPod = deploymentPods.find(
    (pod) =>
      pod.metadata.labels?.['serving.kserve.io/inferenceservice'] ===
      inferenceService.metadata.name,
  );
  const modelPodStatus = deploymentPod ? checkModelStatus(deploymentPod) : null;

  const state = modelPodStatus?.failedToSchedule
    ? InferenceServiceModelState.FAILED_TO_LOAD
    : getInferenceServiceModelState(inferenceService);

  const message = modelPodStatus?.failedToSchedule
    ? modelPodStatus.failureMessage || 'Insufficient resources'
    : getInferenceServiceStatusMessage(inferenceService);

  return { state, message };
};

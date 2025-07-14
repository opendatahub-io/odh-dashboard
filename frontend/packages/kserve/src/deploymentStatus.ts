import { InferenceServiceKind, PodKind } from '@odh-dashboard/internal/k8sTypes';
import {
  checkModelPodStatus,
  getInferenceServiceModelState,
  getInferenceServiceStatusMessage,
} from '@odh-dashboard/internal/concepts/modelServingKServe/kserveStatusUtils';
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
  const modelPodStatus = deploymentPod ? checkModelPodStatus(deploymentPod) : null;

  const state = getInferenceServiceModelState(inferenceService, modelPodStatus);
  const message = getInferenceServiceStatusMessage(inferenceService, modelPodStatus);

  return { state, message };
};

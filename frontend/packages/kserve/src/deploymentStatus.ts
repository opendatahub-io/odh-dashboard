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
    (pod) => pod.metadata.name === inferenceService.metadata.name,
  );
  const modelPodStatus = deploymentPod ? checkModelStatus(deploymentPod) : null;

  return {
    state: modelPodStatus?.failedToSchedule
      ? InferenceServiceModelState.FAILED_TO_LOAD
      : getInferenceServiceModelState(inferenceService),
    message: modelPodStatus?.failedToSchedule
      ? modelPodStatus.failureMessage || 'Insufficient resources'
      : getInferenceServiceStatusMessage(inferenceService),
  };
};

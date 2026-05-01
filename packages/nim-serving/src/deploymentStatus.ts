import type { InferenceServiceKind, PodKind } from '@odh-dashboard/internal/k8sTypes';
import {
  checkModelPodStatus,
  getInferenceServiceModelState,
  getInferenceServiceStatusMessage,
} from '@odh-dashboard/internal/concepts/modelServingKServe/kserveStatusUtils';
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import type { DeploymentStatus } from '@odh-dashboard/model-serving/extension-points';
import { getModelDeploymentStoppedStates } from '@odh-dashboard/model-serving/utils';

/**
 * Derive deployment status from the InferenceService created by the NIM Operator.
 * The NIMService operator reconciles into an InferenceService, so we reuse the
 * KServe status utilities against that child resource.
 *
 * When the InferenceService hasn't been created yet (operator is still reconciling),
 * we return LOADING rather than undefined so the UI shows a meaningful state.
 */
export const getNIMDeploymentStatus = (
  inferenceService: InferenceServiceKind | undefined,
  deploymentPods: PodKind[],
): DeploymentStatus => {
  if (!inferenceService) {
    return {
      state: ModelDeploymentState.LOADING,
      message: 'Waiting for NIM Operator to provision InferenceService',
    };
  }

  const deploymentPod = deploymentPods.find(
    (pod) =>
      pod.metadata.labels?.['serving.kserve.io/inferenceservice'] ===
      inferenceService.metadata.name,
  );
  const modelPodStatus = deploymentPod ? checkModelPodStatus(deploymentPod) : null;

  const state = getInferenceServiceModelState(inferenceService, modelPodStatus);
  const message = getInferenceServiceStatusMessage(inferenceService, modelPodStatus);

  const stoppedStates = getModelDeploymentStoppedStates(
    state,
    inferenceService.metadata.annotations,
    deploymentPod,
  );

  return { state, message, stoppedStates };
};

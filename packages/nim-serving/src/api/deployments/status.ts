import type { PodKind } from '@odh-dashboard/k8s-core';
import type { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
import {
  checkModelPodStatus,
  getInferenceServiceModelState,
  getInferenceServiceStatusMessage,
} from '@odh-dashboard/internal/concepts/modelServingKServe/kserveStatusUtils';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import type { DeploymentStatus } from '@odh-dashboard/model-serving/extension-points';
import { getModelDeploymentStoppedStates } from '@odh-dashboard/model-serving/utils';
import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { NIMDeployment } from '../nimservices/types';
import { NIMServiceModel } from '../nimservices/types';

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
  nimServiceName: string,
): DeploymentStatus => {
  if (!inferenceService) {
    return {
      state: ModelDeploymentState.LOADING,
      message: 'Waiting for NIM Operator to provision InferenceService',
    };
  }

  const matchingPods = deploymentPods.filter(
    (pod) => pod.metadata.labels?.['app.kubernetes.io/name'] === nimServiceName,
  );

  // During re-rollouts there can be multiple pods (old + new).
  // Prefer a Running pod to avoid flickering to FAILED_TO_LOAD when a
  // newly-scheduled pod is temporarily Unschedulable.
  const deploymentPod =
    matchingPods.find((pod) => pod.status?.phase === 'Running') ??
    (matchingPods.length > 0 ? matchingPods[0] : undefined);
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

/**
 * Set the stopped status of the NIM deployment.
 * The NIM Operator propagates the stopped annotation from `spec.annotations`
 * to the child InferenceService's `metadata.annotations`.
 */
export const patchDeploymentStoppedStatus = (
  deployment: NIMDeployment,
  isStopped: boolean,
): Promise<NIMDeployment['model']> =>
  k8sPatchResource({
    model: NIMServiceModel,
    queryOptions: {
      name: deployment.model.metadata.name,
      ns: deployment.model.metadata.namespace,
    },
    patches: [
      {
        op: 'add',
        path: '/spec/annotations/serving.kserve.io~1stop',
        value: isStopped ? 'true' : 'false',
      },
    ],
  });

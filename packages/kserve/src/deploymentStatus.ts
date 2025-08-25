import { InferenceServiceKind, PodKind } from '@odh-dashboard/internal/k8sTypes';
import {
  checkModelPodStatus,
  getInferenceServiceModelState,
  getInferenceServiceStatusMessage,
} from '@odh-dashboard/internal/concepts/modelServingKServe/kserveStatusUtils';
import { DeploymentStatus } from '@odh-dashboard/model-serving/extension-points';
import { InferenceServiceModelState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { InferenceServiceModel } from '@odh-dashboard/internal/api/models/kserve';
import { isModelServingStopped } from './utils';
import { KServeDeployment } from './deployments';

export const patchDeploymentStoppedStatus = (
  deployment: KServeDeployment,
  isStopped: boolean,
): Promise<KServeDeployment['model']> =>
  k8sPatchResource({
    model: InferenceServiceModel,
    queryOptions: {
      name: deployment.model.metadata.name,
      ns: deployment.model.metadata.namespace,
    },
    patches: [
      {
        op: 'add',
        path: '/metadata/annotations/serving.kserve.io~1stop',
        value: isStopped ? 'true' : 'false',
      },
    ],
  });

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

  const isStopped = isModelServingStopped(inferenceService);
  const stoppedStates = {
    // ISVC doesn't have annotation and state is LOADED
    isRunning:
      (state === InferenceServiceModelState.LOADED ||
        state === InferenceServiceModelState.FAILED_TO_LOAD) &&
      !isStopped,
    // ISVC has annotation and there are no pods
    isStopped: isStopped && !deploymentPod,
    // ISVC doesn't have annotation and state is PENDING, LOADING, STANDBY or UNKNOWN
    isStarting:
      (state === InferenceServiceModelState.PENDING ||
        state === InferenceServiceModelState.LOADING ||
        state === InferenceServiceModelState.STANDBY ||
        state === InferenceServiceModelState.UNKNOWN) &&
      !isStopped,
    // ISVC has annotation and there are pods
    isStopping: isStopped && !!deploymentPod,
  };

  return { state, message, stoppedStates };
};

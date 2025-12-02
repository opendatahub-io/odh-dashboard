import type { DeploymentStatus } from '@odh-dashboard/model-serving/extension-points';
import {
  ModelDeploymentState,
  ModelStatus,
} from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions, PodKind } from '@odh-dashboard/internal/k8sTypes';
import { checkModelPodStatus } from '@odh-dashboard/internal/concepts/modelServingKServe/kserveStatusUtils';
import { PodModel } from '@odh-dashboard/internal/api/models/k8s';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { ModelAnnotation } from '@odh-dashboard/internal/pages/projects/screens/spawner/storage/types';
import { LLMdDeployment, LLMInferenceServiceKind, LLMInferenceServiceModel } from '../types';

export const useLLMdInferenceServicePods = (
  namespace: string,
  opts?: K8sAPIOptions,
): CustomWatchK8sResult<PodKind[]> =>
  useK8sWatchResourceList<PodKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(PodModel),
      namespace,
      selector: {
        matchLabels: {
          'app.kubernetes.io/component': 'llminferenceservice-workload',
        },
      },
    },
    PodModel,
    opts,
  );

export const getLLMdDeploymentStatus = (
  inferenceService: LLMInferenceServiceKind,
  deploymentPods: PodKind[],
  lastActivity?: Date,
): DeploymentStatus => {
  const deploymentPod = deploymentPods.length > 0 ? deploymentPods[0] : undefined;

  const modelPodStatus = deploymentPod ? checkModelPodStatus(deploymentPod) : undefined;

  const state = getLLMInferenceServiceModelState(inferenceService, modelPodStatus, lastActivity);
  const message = getLLMInferenceServiceStatusMessage(inferenceService, modelPodStatus);

  const isStopped =
    inferenceService.metadata.annotations?.[ModelAnnotation.STOPPED_ANNOTATION] === 'true';

  const stoppedStates = {
    isRunning:
      (state === ModelDeploymentState.LOADED || state === ModelDeploymentState.FAILED_TO_LOAD) &&
      !isStopped,
    // LLMISVC has stop annotation and there are no pods
    isStopped: isStopped && !deploymentPod,
    // LLMISVC doesn't have stop annotation and state is PENDING, LOADING, STANDBY or UNKNOWN
    isStarting:
      (state === ModelDeploymentState.PENDING ||
        state === ModelDeploymentState.LOADING ||
        state === ModelDeploymentState.STANDBY ||
        state === ModelDeploymentState.UNKNOWN) &&
      !isStopped,
    // LLMISVC has stop annotation and there are pods
    isStopping: isStopped && !!deploymentPod,
  };

  return { state, message, stoppedStates };
};

export const patchDeploymentStoppedStatus = (
  deployment: LLMdDeployment,
  isStopped: boolean,
): Promise<LLMdDeployment['model']> =>
  k8sPatchResource({
    model: LLMInferenceServiceModel,
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

export const getLLMInferenceServiceModelState = (
  is: LLMInferenceServiceKind,
  modelPodStatus?: ModelStatus | null,
  lastActivity?: Date,
): ModelDeploymentState => {
  const gracePeriod = calculateGracePeriod(lastActivity);

  const readyCondition = is.status?.conditions?.find((condition) => condition.type === 'Ready');
  if (modelPodStatus?.failedToSchedule) {
    return ModelDeploymentState.FAILED_TO_LOAD;
  }

  if (
    (gracePeriod && readyCondition?.status !== 'True') ||
    // if the service is actually stopped it overrides this, checking for stopped here prevents a false failure while the status is updating after hitting start
    (readyCondition?.message && readyCondition.message === 'Service is stopped')
  ) {
    return ModelDeploymentState.PENDING;
  }

  if (readyCondition?.status === 'False') {
    return ModelDeploymentState.FAILED_TO_LOAD;
  }

  if (readyCondition?.status === 'True') {
    return ModelDeploymentState.LOADED;
  }

  return ModelDeploymentState.UNKNOWN;
};

export const getLLMInferenceServiceStatusMessage = (
  is: LLMInferenceServiceKind,
  modelPodStatus?: ModelStatus | null,
): string => {
  if (modelPodStatus?.failedToSchedule) {
    return modelPodStatus.failureMessage || 'Insufficient resources';
  }
  const stateMessage =
    is.status?.conditions?.find((condition) => condition.type === 'Ready')?.message ?? 'Unknown';

  return stateMessage;
};

const calculateGracePeriod = (lastActivity?: Date): boolean => {
  if (!lastActivity || Number.isNaN(lastActivity.getTime())) {
    return false;
  }
  const now = Date.now();
  const idleTime = new Date(lastActivity).setSeconds(lastActivity.getSeconds() + 180);
  // Return true if we're still within grace period
  return idleTime - now > 0;
};

import { ToggleState } from '@odh-dashboard/internal/components/StateActionToggle';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';

export const getModelDeploymentStoppedStates = (
  state: ModelDeploymentState,
  modelAnnotations?: Record<string, string>,
  deploymentPod?: PodKind,
): ToggleState => {
  const isStopped = isModelServingStopped(modelAnnotations);
  const stoppedStates = {
    // ISVC doesn't have annotation and state is LOADED
    isRunning:
      (state === ModelDeploymentState.LOADED || state === ModelDeploymentState.FAILED_TO_LOAD) &&
      !isStopped,
    // ISVC has annotation and there are no pods
    isStopped: isStopped && !deploymentPod,
    // ISVC doesn't have annotation and state is PENDING, LOADING, STANDBY or UNKNOWN
    isStarting:
      (state === ModelDeploymentState.PENDING ||
        state === ModelDeploymentState.LOADING ||
        state === ModelDeploymentState.STANDBY ||
        state === ModelDeploymentState.UNKNOWN) &&
      !isStopped,
    // ISVC has annotation and there are pods
    isStopping: isStopped && !!deploymentPod,
  };
  return stoppedStates;
};

export const isModelServingStopped = (modelAnnotations?: Record<string, string>): boolean =>
  modelAnnotations?.['serving.kserve.io/stop'] === 'true';

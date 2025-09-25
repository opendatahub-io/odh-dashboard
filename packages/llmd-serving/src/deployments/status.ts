import type { DeploymentStatus } from '@odh-dashboard/model-serving/extension-points';
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import type { LLMInferenceServiceKind } from '../types';

// https://redhat-internal.slack.com/archives/C062CCKAJ3D/p1758724105720909
export const getLlmdDeploymentStatus = (
  llmInferenceService: LLMInferenceServiceKind,
): DeploymentStatus => {
  const ready = llmInferenceService.status?.conditions?.find(
    (condition) => condition.type === 'Ready' && condition.status === 'True',
  );
  return {
    state: ready ? ModelDeploymentState.LOADED : ModelDeploymentState.FAILED_TO_LOAD,
    message: ready ? 'Model deployment is healthy.' : 'One or more resources are not ready.',
    stoppedStates: {
      isRunning: true,
      isStopped: false,
      isStarting: false,
      isStopping: false,
    },
  };
};

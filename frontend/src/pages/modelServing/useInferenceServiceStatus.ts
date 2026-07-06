import * as React from 'react';
import { getInferenceServiceModelState } from '#~/concepts/modelServingKServe/kserveStatusUtils.ts';
import { ModelDeploymentState, ModelServingState } from '#~/pages/modelServing/screens/types';
import useModelPodStatus from '#~/pages/modelServing/useModelPodStatus';
import { FAST_POLL_INTERVAL } from '#~/utilities/const.ts';
import { InferenceServiceKind } from '#~/k8sTypes.ts';
import { getInferenceServiceStoppedStatus } from './utils';

type InferenceServiceStatus = ModelServingState & {
  setIsStarting: (isStarting: boolean) => void;
  setIsStopping: (isStopping: boolean) => void;
  isFailed: boolean;
};

export const useInferenceServiceStatus = (
  inferenceService: InferenceServiceKind,
  refresh?: () => void,
): InferenceServiceStatus => {
  const [isStarting, setIsStarting] = React.useState(false);
  const [isStopping, setIsStopping] = React.useState(false);
  const [pollingInterval, setPollingInterval] = React.useState<NodeJS.Timeout | null>(null);

  const { data: modelPodStatus, refresh: refreshModelPodStatus } = useModelPodStatus(
    inferenceService.metadata.namespace,
    inferenceService.metadata.name,
  );

  // Manual polling when isStopping is true
  React.useEffect(() => {
    if (isStopping) {
      const interval = setInterval(async () => {
        await refreshModelPodStatus();
        if (!modelPodStatus) {
          setIsStopping(false);
        }
      }, FAST_POLL_INTERVAL);

      setPollingInterval(interval);

      return () => {
        clearInterval(interval);
        setPollingInterval(null);
      };
    }
    if (pollingInterval) {
      return () => {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStopping, refreshModelPodStatus, refresh, modelPodStatus]);

  // Handle starting state changes
  React.useEffect(() => {
    if (!isStarting) {
      return;
    }

    const currentState = getInferenceServiceModelState(inferenceService);

    if (
      currentState === ModelDeploymentState.LOADING ||
      currentState === ModelDeploymentState.PENDING
    ) {
      setIsStarting(true);
    }

    if ([ModelDeploymentState.LOADED, ModelDeploymentState.FAILED_TO_LOAD].includes(currentState)) {
      setIsStarting(false);
    }
  }, [isStarting, inferenceService]);

  const baseStatus = getInferenceServiceStoppedStatus(inferenceService);
  const isStopped = baseStatus.isStopped && !isStopping;
  const isRunning = baseStatus.isRunning && !isStarting;

  const isNewlyDeployed = React.useMemo(
    () =>
      !inferenceService.status?.modelStatus?.states?.activeModelState &&
      inferenceService.status?.modelStatus?.states?.targetModelState !==
        ModelDeploymentState.FAILED_TO_LOAD &&
      !isStopped &&
      !isStopping,
    [inferenceService.status?.modelStatus?.states, isStopped, isStopping],
  );

  const modelDeploymentState = getInferenceServiceModelState(inferenceService);

  return {
    ...baseStatus,
    isStarting: isStarting || isNewlyDeployed,
    isStopping,
    isStopped,
    isRunning,
    isFailed: modelDeploymentState === ModelDeploymentState.FAILED_TO_LOAD,
    setIsStarting,
    setIsStopping,
  };
};

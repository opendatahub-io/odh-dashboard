import * as React from 'react';
import { getInferenceServiceModelState } from '#~/concepts/modelServingKServe/kserveStatusUtils.ts';
import { InferenceServiceModelState, ModelServingState } from '#~/pages/modelServing/screens/types';
import useModelPodStatus from '#~/pages/modelServing/useModelPodStatus';
import { FAST_POLL_INTERVAL } from '#~/utilities/const.ts';
import { InferenceServiceKind } from '#~/k8sTypes.ts';
import { getInferenceServiceStoppedStatus } from './utils';

type ModelStatus = ModelServingState & {
  setIsStarting: (isStarting: boolean) => void;
  setIsStopping: (isStopping: boolean) => void;
};

export const useModelStatus = (
  inferenceService: InferenceServiceKind,
  refresh?: () => void,
): ModelStatus => {
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
      currentState === InferenceServiceModelState.LOADING ||
      currentState === InferenceServiceModelState.PENDING
    ) {
      setIsStarting(true);
    }

    if (
      [InferenceServiceModelState.LOADED, InferenceServiceModelState.FAILED_TO_LOAD].includes(
        currentState,
      )
    ) {
      setIsStarting(false);
    }
  }, [isStarting, inferenceService]);

  const baseStatus = getInferenceServiceStoppedStatus(inferenceService);

  return {
    ...baseStatus,
    isStarting,
    isStopping,
    setIsStarting,
    setIsStopping,
  };
};

import * as React from 'react';
import {
  getInferenceServiceModelState,
  checkModelPodStatus,
} from '#~/concepts/modelServingKServe/kserveStatusUtils.ts';
import { ModelDeploymentState, ModelServingState } from '#~/pages/modelServing/screens/types';
import useModelPodStatus from '#~/pages/modelServing/useModelPodStatus';
import { FAST_POLL_INTERVAL } from '#~/utilities/const.ts';
import { InferenceServiceKind, NIMServiceState } from '#~/k8sTypes.ts';
import { getNIMService } from '#~/api';
import {
  isNIMOperatorManaged,
  getNIMServiceName,
} from '#~/pages/modelServing/screens/projects/nim/nimOperatorUtils';
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

  const { data: modelPod, refresh: refreshModelPodStatus } = useModelPodStatus(
    inferenceService.metadata.namespace,
    inferenceService.metadata.name,
  );

  // Compute pod status from the actual pod
  const modelPodStatus = React.useMemo(() => {
    if (!modelPod) {
      return null;
    }
    return checkModelPodStatus(modelPod);
  }, [modelPod]);

  // Refresh pod status when InferenceService updates
  React.useEffect(() => {
    refreshModelPodStatus();
  }, [inferenceService.status?.modelStatus?.states, refreshModelPodStatus]);

  // NIM Operator status: poll the parent NIMService for accurate state
  const isNIMManaged = isNIMOperatorManaged(inferenceService);
  const nimServiceName = isNIMManaged ? getNIMServiceName(inferenceService) : undefined;
  const [nimServiceReady, setNimServiceReady] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!isNIMManaged || !nimServiceName) {
      setNimServiceReady(null);
      return undefined;
    }

    // Already confirmed ready — no need to poll further
    if (nimServiceReady === true) {
      return undefined;
    }

    let stale = false;

    const checkNIMServiceStatus = async () => {
      try {
        const nimService = await getNIMService(nimServiceName, inferenceService.metadata.namespace);
        const state = nimService.status?.state;
        if (!stale) {
          setNimServiceReady(state === NIMServiceState.Ready);
        }
      } catch {
        if (!stale) {
          setNimServiceReady(null);
        }
      }
    };

    checkNIMServiceStatus();

    const interval = setInterval(checkNIMServiceStatus, FAST_POLL_INTERVAL);

    return () => {
      stale = true;
      clearInterval(interval);
    };
  }, [isNIMManaged, nimServiceName, inferenceService.metadata.namespace, nimServiceReady]);

  const nimServiceNotReady = isNIMManaged && nimServiceReady === false;

  // Manual polling when isStopping is true
  React.useEffect(() => {
    if (isStopping) {
      const interval = setInterval(async () => {
        await refreshModelPodStatus();
        if (!modelPod) {
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
  }, [isStopping, refreshModelPodStatus, refresh, modelPod]);

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

  // Check if InferenceService claims to be loaded but pod is not actually running
  // This handles cases where KServe incorrectly reports status (e.g., NIM Operator deployments)
  const isIncorrectlyReportedAsLoaded = React.useMemo(() => {
    const targetState = inferenceService.status?.modelStatus?.states?.targetModelState;
    const activeState = inferenceService.status?.modelStatus?.states?.activeModelState;

    // If InferenceService says model is Loaded
    if (
      targetState === ModelDeploymentState.LOADED ||
      activeState === ModelDeploymentState.LOADED
    ) {
      // But pod has failed to schedule (resource constraints, PVC issues, etc.)
      if (modelPodStatus?.failedToSchedule) {
        return true;
      }
    }
    return false;
  }, [inferenceService.status?.modelStatus?.states, modelPodStatus]);

  return {
    ...baseStatus,
    isStarting:
      isStarting || isNewlyDeployed || isIncorrectlyReportedAsLoaded || nimServiceNotReady,
    isStopping,
    isStopped,
    isRunning: isRunning && !isIncorrectlyReportedAsLoaded && !nimServiceNotReady,
    isFailed: modelDeploymentState === ModelDeploymentState.FAILED_TO_LOAD,
    setIsStarting,
    setIsStopping,
  };
};

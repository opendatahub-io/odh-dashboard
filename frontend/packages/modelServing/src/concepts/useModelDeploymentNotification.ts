import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import {
  NotificationResponseStatus,
  NotificationWatcherContext,
} from '@odh-dashboard/internal/concepts/notificationWatcher/NotificationWatcherContext';
import { InferenceServiceModelState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import {
  getInferenceServiceLastFailureReason,
  getInferenceServiceModelState,
} from '@odh-dashboard/internal/concepts/modelServingKServe/kserveStatusUtils';

import { getInferenceService } from '@odh-dashboard/internal/api/k8s/inferenceServices';

type ModelDeploymentNotification = {
  watchDeployment: () => void;
};

export const useModelDeploymentNotification = (
  namespace: string,
  modelName: string,
): ModelDeploymentNotification => {
  const navigate = useNavigate();
  const notification = useNotification();
  const { registerNotification } = React.useContext(NotificationWatcherContext);
  const lastSeenState = React.useRef<InferenceServiceModelState | null>(null);

  const watchDeployment = React.useCallback(() => {
    registerNotification({
      callback: async (signal) => {
        try {
          const inferenceService = await getInferenceService(modelName, namespace, { signal });
          const inferenceServiceModelState = getInferenceServiceModelState(inferenceService);

          // A model is considered "stopped" if it has no active pods and is not in a starting/failed state
          const isStopped =
            !inferenceService.status?.modelStatus?.states?.activeModelState &&
            inferenceServiceModelState !== InferenceServiceModelState.PENDING &&
            inferenceServiceModelState !== InferenceServiceModelState.LOADING &&
            inferenceServiceModelState !== InferenceServiceModelState.UNKNOWN &&
            inferenceServiceModelState !== InferenceServiceModelState.FAILED_TO_LOAD; // Don't consider failed models as stopped

          const isStarting =
            !inferenceService.status?.modelStatus?.states?.activeModelState &&
            inferenceService.status?.modelStatus?.states?.targetModelState !==
              InferenceServiceModelState.FAILED_TO_LOAD &&
            !isStopped;

          const isRunning = inferenceServiceModelState === InferenceServiceModelState.LOADED;

          // Track previous state
          const lastState = lastSeenState.current;
          lastSeenState.current = inferenceServiceModelState;

          // Only consider it failed if it's not stopped, the state is FAILED_TO_LOAD, and the last state was PENDING
          const isFailed =
            !isStopped &&
            inferenceServiceModelState === InferenceServiceModelState.FAILED_TO_LOAD &&
            lastState === InferenceServiceModelState.PENDING;

          const lastFailureReason = getInferenceServiceLastFailureReason(inferenceService);

          if (isFailed) {
            notification.error(
              'Model deployment failed',
              lastFailureReason ||
                'Failed to load the model. Please check the model configuration and try again.',
              [
                {
                  title: 'View deployment',
                  onClick: () => navigate(`/modelServing/${namespace}`),
                },
              ],
            );
            return { status: NotificationResponseStatus.STOP };
          }

          if (isRunning && lastState === InferenceServiceModelState.LOADED) {
            // Model is running, stop polling
            return { status: NotificationResponseStatus.STOP };
          }

          if (isStopped) {
            // Model appears stopped, but let's continue polling for a bit to see if it's just in transition
            // Only stop if we've seen the same stopped state multiple times
            if (lastState === InferenceServiceModelState.UNKNOWN || lastState === null) {
              // First time seeing this state, continue polling
              return { status: NotificationResponseStatus.REPOLL };
            }
            // Model is genuinely stopped, stop polling
            return { status: NotificationResponseStatus.STOP };
          }

          if (
            isStarting ||
            inferenceServiceModelState === InferenceServiceModelState.PENDING ||
            inferenceServiceModelState === InferenceServiceModelState.LOADING
          ) {
            // Model is still starting/loading, continue polling
            return { status: NotificationResponseStatus.REPOLL };
          }

          return { status: NotificationResponseStatus.STOP };
        } catch (error: unknown) {
          // If we can't fetch the inference service, it was probably deleted
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('404') || errorMessage.includes('not found')) {
            // Model was deleted, stop polling
            return { status: NotificationResponseStatus.STOP };
          }

          notification.error('Error checking model deployment', errorMessage);
          return {
            status: NotificationResponseStatus.STOP,
          };
        }
      },
    });
  }, [registerNotification, navigate, namespace, modelName, notification]);

  return { watchDeployment };
};

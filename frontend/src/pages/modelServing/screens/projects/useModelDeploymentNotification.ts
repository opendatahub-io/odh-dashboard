import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import useNotification from '#~/utilities/useNotification';
import {
  NotificationResponseStatus,
  NotificationWatcherContext,
} from '#~/concepts/notificationWatcher/NotificationWatcherContext';
import { getInferenceService } from '#~/api';
import { ModelDeploymentState } from '#~/pages/modelServing/screens/types';
import {
  getInferenceServiceLastFailureReason,
  getInferenceServiceModelState,
} from '#~/concepts/modelServingKServe/kserveStatusUtils';
import { useModelStatus } from '#~/pages/modelServing/screens/global/useModelStatus';
import { getInferenceServiceStoppedStatus } from '#~/pages/modelServing/utils';
import { FAST_POLL_INTERVAL } from '#~/utilities/const';

type ModelDeploymentNotification = {
  watchDeployment: () => void;
};

export const useModelDeploymentNotification = (
  namespace: string,
  modelName: string,
  isKserve: boolean,
): ModelDeploymentNotification => {
  const navigate = useNavigate();
  const notification = useNotification();
  const { registerNotification } = React.useContext(NotificationWatcherContext);
  const [modelStatus] = useModelStatus(namespace, modelName, isKserve);
  const lastSeenState = React.useRef<ModelDeploymentState | null>(null);

  const watchDeployment = React.useCallback(() => {
    registerNotification({
      callbackDelay: FAST_POLL_INTERVAL,
      callback: async (signal) => {
        // Early failure detection from pod scheduling
        if (modelStatus?.failedToSchedule) {
          notification.error(
            'Model deployment failed',
            'Insufficient resources to schedule the model deployment. Please check your resource quotas and try again.',
            [
              {
                title: 'View deployment',
                onClick: () => navigate(`/modelServing/${namespace}`),
              },
            ],
          );
          return { status: NotificationResponseStatus.STOP };
        }

        try {
          const inferenceService = await getInferenceService(modelName, namespace, { signal });

          const baseStatus = getInferenceServiceStoppedStatus(inferenceService);
          const inferenceServiceModelState = getInferenceServiceModelState(inferenceService);

          const { isStopped } = baseStatus;
          const isStarting =
            !inferenceService.status?.modelStatus?.states?.activeModelState &&
            inferenceService.status?.modelStatus?.states?.targetModelState !==
              ModelDeploymentState.FAILED_TO_LOAD &&
            !baseStatus.isStopped;

          const isRunning = inferenceServiceModelState === ModelDeploymentState.LOADED;

          // Track previous state
          const lastState = lastSeenState.current;
          lastSeenState.current = inferenceServiceModelState;

          // Only consider it failed if it's not stopped, the state is FAILED_TO_LOAD, and the last state was PENDING
          const isFailed =
            !isStopped &&
            inferenceServiceModelState === ModelDeploymentState.FAILED_TO_LOAD &&
            lastState === ModelDeploymentState.PENDING;

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

          if (isRunning && lastState === ModelDeploymentState.LOADED) {
            // Model is running, stop polling
            return { status: NotificationResponseStatus.STOP };
          }

          if (isStopped) {
            // Model is stopped, stop polling
            return { status: NotificationResponseStatus.STOP };
          }

          if (
            isStarting ||
            inferenceServiceModelState === ModelDeploymentState.PENDING ||
            inferenceServiceModelState === ModelDeploymentState.LOADING
          ) {
            // Model is still starting/loading, continue polling
            return { status: NotificationResponseStatus.REPOLL };
          }

          // For any other state, stop polling
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
  }, [
    registerNotification,
    modelStatus?.failedToSchedule,
    navigate,
    namespace,
    modelName,
    notification,
  ]);

  return { watchDeployment };
};

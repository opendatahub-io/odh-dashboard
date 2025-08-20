import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import {
  NotificationResponseStatus,
  NotificationWatcherContext,
} from '@odh-dashboard/internal/concepts/notificationWatcher/NotificationWatcherContext';
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { FAST_POLL_INTERVAL } from '@odh-dashboard/internal/utilities/const';
import { DeploymentStatus } from '../../extension-points';

type ModelDeploymentNotification = {
  watchDeployment: () => void;
};

export const useModelDeploymentNotification = (
  deploymentStatusRef: React.MutableRefObject<DeploymentStatus | undefined>,
  namespace: string,
): ModelDeploymentNotification => {
  const navigate = useNavigate();
  const notification = useNotification();
  const { registerNotification } = React.useContext(NotificationWatcherContext);
  const lastSeenState = React.useRef<ModelDeploymentState | null>(null);

  const watchDeployment = React.useCallback(() => {
    registerNotification({
      callbackDelay: FAST_POLL_INTERVAL,
      callback: async () => {
        try {
          const currentStatus = deploymentStatusRef.current;
          if (!currentStatus) {
            return { status: NotificationResponseStatus.STOP };
          }

          const deploymentState = currentStatus.state;
          //const isStoppedState = currentStatus.stoppedStates?.isStopped || false;
          const {
            isStarting: isStartingState,
            isRunning: isRunningState,
            isStopped: isStoppedState,
          } = currentStatus.stoppedStates || {};
          const isFailedState = deploymentState === ModelDeploymentState.FAILED_TO_LOAD;

          // Track previous state
          const lastState = lastSeenState.current;
          lastSeenState.current = deploymentState;

          // Only consider it failed if it's not stopped, the state is FAILED_TO_LOAD, and the last state was PENDING
          const isFailed = isFailedState && lastState === ModelDeploymentState.PENDING;

          if (isFailed) {
            notification.error(
              'Model deployment failed',
              currentStatus.message ||
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

          if (isRunningState && lastState === ModelDeploymentState.LOADED) {
            // Model is running, stop polling
            return { status: NotificationResponseStatus.STOP };
          }

          if (isStoppedState) {
            // Model appears stopped, but let's continue polling for a bit to see if it's just in transition
            // Only stop if we've seen the same stopped state multiple times
            if (lastState === ModelDeploymentState.UNKNOWN || lastState === null) {
              // First time seeing this state, continue polling
              return { status: NotificationResponseStatus.REPOLL };
            }
            // Model is genuinely stopped, stop polling
            return { status: NotificationResponseStatus.STOP };
          }

          if (
            isStartingState ||
            lastState === ModelDeploymentState.PENDING ||
            lastState === ModelDeploymentState.LOADING
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
  }, [registerNotification, navigate, deploymentStatusRef, namespace, notification]);

  return { watchDeployment };
};

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import {
  NotificationResponseStatus,
  NotificationWatcherContext,
} from '@odh-dashboard/internal/concepts/notificationWatcher/NotificationWatcherContext';
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { FAST_POLL_INTERVAL } from '@odh-dashboard/internal/utilities/const';
import { useResolvedDeploymentExtension } from '../concepts/extensionUtils';
import {
  Deployment,
  isModelServingPlatformFetchDeploymentStatus,
  ModelServingPlatformFetchDeploymentStatus,
} from '../../extension-points';

type ModelDeploymentNotification = {
  watchDeployment: () => void;
};

export const useModelDeploymentNotification = (
  deployment: Deployment,
): ModelDeploymentNotification => {
  const { namespace } = deployment.model.metadata;

  const [fetchDeploymentExtension, fetchDeploymentExtensionLoaded] =
    useResolvedDeploymentExtension<ModelServingPlatformFetchDeploymentStatus>(
      isModelServingPlatformFetchDeploymentStatus,
      deployment,
    );

  const navigate = useNavigate();
  const notification = useNotification();
  const { registerNotification } = React.useContext(NotificationWatcherContext);
  // Holds initial deployment state when the notification is registered, and updates when the deployment state changes
  const lastSeenState = React.useRef<ModelDeploymentState | null>(null);

  const watchDeployment = React.useCallback(() => {
    registerNotification({
      callbackDelay: FAST_POLL_INTERVAL,
      callback: async () => {
        try {
          if (!fetchDeploymentExtensionLoaded) {
            return { status: NotificationResponseStatus.REPOLL };
          }

          if (!fetchDeploymentExtension) {
            return { status: NotificationResponseStatus.STOP };
          }

          const fetchedDeployment = await fetchDeploymentExtension.properties.fetch(
            deployment.model.metadata.name,
            deployment.model.metadata.namespace,
          );
          const deploymentStatus = fetchedDeployment?.status;

          const currentStatus = deploymentStatus;
          if (!currentStatus) {
            return { status: NotificationResponseStatus.STOP };
          }

          const deploymentState = currentStatus.state;
          const {
            isStarting: isStartingState,
            isRunning: isRunningState,
            isStopped: isStoppedState,
          } = currentStatus.stoppedStates || {};
          const isFailedState = deploymentState === ModelDeploymentState.FAILED_TO_LOAD;

          // Track previous state of the deployment
          const lastState = lastSeenState.current;
          let adjustedLastState = lastState;

          // Reset lastState if we're transitioning from a failed state to a starting state
          if (
            lastState === ModelDeploymentState.FAILED_TO_LOAD &&
            (deploymentState === ModelDeploymentState.UNKNOWN ||
              deploymentState === ModelDeploymentState.PENDING)
          ) {
            lastSeenState.current = null;
            adjustedLastState = null;
          } else {
            lastSeenState.current = deploymentState;
          }

          // Only consider it failed if it's not stopped, the state is FAILED_TO_LOAD, and the last state was PENDING
          const isFailed = isFailedState && adjustedLastState === ModelDeploymentState.PENDING;

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

          if (isRunningState && adjustedLastState === ModelDeploymentState.LOADED) {
            // Model is running, stop polling
            return { status: NotificationResponseStatus.STOP };
          }

          if (isStoppedState) {
            // Model appears stopped, but let's continue polling for a bit to see if it's just in transition
            // Only stop if we've seen the same stopped state multiple times
            if (adjustedLastState === ModelDeploymentState.UNKNOWN || adjustedLastState === null) {
              // First time seeing this state, continue polling
              return { status: NotificationResponseStatus.REPOLL };
            }
            // Model is genuinely stopped, stop polling
            return { status: NotificationResponseStatus.STOP };
          }

          if (
            isStartingState ||
            adjustedLastState === ModelDeploymentState.PENDING ||
            adjustedLastState === ModelDeploymentState.LOADING
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
  }, [
    registerNotification,
    navigate,
    namespace,
    notification,
    fetchDeploymentExtension,
    fetchDeploymentExtensionLoaded,
  ]);

  return { watchDeployment };
};

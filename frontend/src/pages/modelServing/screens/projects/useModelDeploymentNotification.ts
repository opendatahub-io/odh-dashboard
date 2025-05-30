import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import useNotification from '#~/utilities/useNotification';
import {
  NotificationResponseStatus,
  NotificationWatcherContext,
} from '#~/concepts/notificationWatcher/NotificationWatcherContext';
import { getInferenceService } from '#~/api';
import { InferenceServiceModelState } from '#~/pages/modelServing/screens/types';
import {
  getInferenceServiceLastFailureReason,
  getInferenceServiceModelState,
} from '#~/pages/modelServing/screens/global/utils';
import { useModelStatus } from '#~/pages/modelServing/screens/global/useModelStatus';

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

  const watchDeployment = React.useCallback(() => {
    registerNotification({
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
          const modelState = getInferenceServiceModelState(inferenceService);
          const lastFailureReason = getInferenceServiceLastFailureReason(inferenceService);
          switch (modelState) {
            case InferenceServiceModelState.FAILED_TO_LOAD:
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
            case InferenceServiceModelState.LOADED:
            case InferenceServiceModelState.STANDBY:
              return { status: NotificationResponseStatus.STOP };
            case InferenceServiceModelState.PENDING:
            case InferenceServiceModelState.LOADING:
            case InferenceServiceModelState.UNKNOWN:
            default:
              return { status: NotificationResponseStatus.REPOLL };
          }
        } catch (error: unknown) {
          notification.error(
            'Error checking model deployment',
            error instanceof Error ? error.message : 'Unknown error',
          );
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

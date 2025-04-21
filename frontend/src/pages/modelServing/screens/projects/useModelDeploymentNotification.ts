import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import useNotification from '~/utilities/useNotification';
import { NotificationWatcherContext } from '~/concepts/notificationWatcher/NotificationWatcherContext';
import { getInferenceService } from '~/api';
import { InferenceServiceModelState } from '~/pages/modelServing/screens/types';
import {
  getInferenceServiceModelState,
  getInferenceServiceStatusMessage,
} from '~/pages/modelServing/screens/global/utils';
import { useModelStatus } from '~/pages/modelServing/screens/global/useModelStatus';

type ModelDeploymentNotification = {
  watchDeployment: () => void;
  notifyError: (error: Error) => void;
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
          return {
            status: 'error',
            title: 'Model deployment failed',
            message:
              'Insufficient resources to schedule the model deployment. Please check your resource quotas and try again.',
            actions: [
              {
                title: 'View details',
                onClick: () => {
                  navigate(`/modelServing/${namespace}`);
                },
              },
            ],
          };
        }

        try {
          const inferenceService = await getInferenceService(modelName, namespace, { signal });
          const modelState = getInferenceServiceModelState(inferenceService);
          const statusMessage = getInferenceServiceStatusMessage(inferenceService);

          switch (modelState) {
            case InferenceServiceModelState.FAILED_TO_LOAD:
              notification.error(
                'Model deployment failed',
                statusMessage ||
                  'Failed to load the model. Please check the model configuration and try again.',
                [{ title: 'View details', onClick: () => navigate(`/modelServing/${namespace}`) }],
              );
              return { status: 'stop' };
            case InferenceServiceModelState.LOADED:
            case InferenceServiceModelState.STANDBY:
              return { status: 'stop' };
            case InferenceServiceModelState.PENDING:
            case InferenceServiceModelState.LOADING:
            case InferenceServiceModelState.UNKNOWN:
            default:
              return { status: 'repoll' };
          }
        } catch (error: unknown) {
          if (
            typeof error === 'object' &&
            error !== null &&
            'statusObject' in error &&
            error.statusObject &&
            typeof error.statusObject === 'object' &&
            'code' in error.statusObject &&
            error.statusObject.code === 404
          ) {
            return { status: 'repoll' };
          }
          return {
            status: 'error',
            title: 'Error checking model deployment',
            message: error instanceof Error ? error.message : 'Unknown error',
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

  const notifyError = React.useCallback(
    (error: Error) => {
      notification.error('Model deployment failed', error.message, [
        {
          title: 'View details',
          onClick: () => {
            // TODO: Navigate to deployment details
            // This will be implemented in a follow-up PR
          },
        },
      ]);
    },
    [notification],
  );

  return { watchDeployment, notifyError };
};

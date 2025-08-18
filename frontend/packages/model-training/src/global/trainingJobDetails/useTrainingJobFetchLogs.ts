import * as React from 'react';
import useFetchState, {
  FetchState,
  NotReadyError,
} from '@odh-dashboard/internal/utilities/useFetchState';
import { getPodContainerLogText } from '@odh-dashboard/internal/api/k8s/pods';
import { LOG_REFRESH_RATE } from '@odh-dashboard/internal/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/const';

const useTrainingJobFetchLogs = (
  namespace: string,
  podName: string,
  containerName: string,
  activelyRefresh?: boolean,
  tail?: number,
): FetchState<string> => {
  const callback = React.useCallback(() => {
    if (!podName || !containerName || !namespace) {
      return Promise.reject(new NotReadyError('Not enough information to fetch from pod'));
    }

    return getPodContainerLogText(namespace, podName, containerName, tail);
  }, [podName, containerName, namespace, tail]);

  return useFetchState(callback, '', {
    refreshRate: activelyRefresh ? LOG_REFRESH_RATE : 0,
    initialPromisePurity: true,
  });
};

export default useTrainingJobFetchLogs;

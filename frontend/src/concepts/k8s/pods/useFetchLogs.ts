import * as React from 'react';
import useFetchState, { FetchState, NotReadyError } from '#~/utilities/useFetchState';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { getPodContainerLogText } from '#~/api';
import { LOG_REFRESH_RATE } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/const';

const useFetchLogs = (
  podName: string,
  containerName: string,
  activelyRefresh?: boolean,
  tail?: number,
): FetchState<string> => {
  const { namespace } = usePipelinesAPI();

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

export default useFetchLogs;

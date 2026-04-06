import * as React from 'react';
import { NotReadyError } from '@odh-dashboard/internal/utilities/useFetchState';
import useFetch, { FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import { getRayJobDriverLogs } from '../api/rayJobLogs';

const LOG_REFRESH_RATE = 30000;

const useFetchRayJobLogs = (
  namespace: string,
  podName: string | undefined,
  containerName: string | undefined,
  jobId: string | undefined,
  activelyRefresh?: boolean,
): FetchStateObject<string> => {
  const callback = React.useCallback(() => {
    if (!podName || !containerName || !jobId || !namespace) {
      return Promise.reject(new NotReadyError('Missing head pod, container, or job ID'));
    }

    return getRayJobDriverLogs(namespace, podName, containerName, jobId);
  }, [namespace, podName, containerName, jobId]);

  return useFetch(callback, '', {
    refreshRate: activelyRefresh ? LOG_REFRESH_RATE : 0,
    initialPromisePurity: false,
  });
};

export default useFetchRayJobLogs;

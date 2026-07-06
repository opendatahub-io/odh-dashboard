import * as React from 'react';
import { getPodContainerLogText } from '@odh-dashboard/internal/api/k8s/pods';
import { NotReadyError } from '@odh-dashboard/internal/utilities/useFetchState';
import useFetch, { FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';

const LOG_REFRESH_RATE = 3000;

const useFetchLogs = (
  namespace: string,
  podName: string,
  containerName: string,
  activelyRefresh?: boolean,
  tail?: number,
): FetchStateObject<string> => {
  const callback = React.useCallback(() => {
    if (!podName || !containerName || !namespace) {
      return Promise.reject(new NotReadyError('Not enough information to fetch from pod'));
    }

    return getPodContainerLogText(namespace, podName, containerName, tail);
  }, [podName, containerName, namespace, tail]);

  return useFetch(callback, '', {
    refreshRate: activelyRefresh ? LOG_REFRESH_RATE : 0,
    initialPromisePurity: true,
  });
};

export default useFetchLogs;

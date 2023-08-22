import * as React from 'react';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { getPodContainerLogText } from '~/api';

const useFetchLogs = (podName: string, containerName: string, tail = 500): FetchState<string> => {
  const { namespace } = usePipelinesAPI();

  const callback = React.useCallback(() => {
    if (!podName || !containerName || !namespace) {
      return Promise.reject(new NotReadyError('Not enough information to fetch from pod'));
    }

    return getPodContainerLogText(namespace, podName, containerName, tail);
  }, [podName, containerName, namespace, tail]);

  return useFetchState(callback, '');
};

export default useFetchLogs;

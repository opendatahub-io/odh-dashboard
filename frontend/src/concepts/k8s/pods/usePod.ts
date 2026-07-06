import * as React from 'react';
import type { PodKind } from '@odh-dashboard/k8s-core';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';
import { getPod } from '#~/api';
import { POD_REFRESH_RATE } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/const';

type PodState = PodKind | null;

const usePod = (namespace: string, podName: string): FetchState<PodState> => {
  const callback = React.useCallback<FetchStateCallbackPromise<PodState>>(() => {
    if (!podName) {
      return Promise.reject(new NotReadyError('No pod name'));
    }
    return getPod(namespace, podName);
  }, [namespace, podName]);

  return useFetchState(callback, null, {
    initialPromisePurity: true,
    refreshRate: POD_REFRESH_RATE,
  });
};

export default usePod;

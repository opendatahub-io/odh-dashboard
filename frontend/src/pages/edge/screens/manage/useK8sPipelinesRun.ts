import React from 'react';
import useFetchState, { FetchStateCallbackPromise, NotReadyError } from '~/utilities/useFetchState';
import { PipelineRunKind } from '~/k8sTypes';
import { getK8sPipelineRun } from '~/api';

const useK8sPipelinesRun = (namespace: string, name?: string) => {
  const callback = React.useCallback<FetchStateCallbackPromise<PipelineRunKind | null>>(() => {
    if (!name) {
      return Promise.reject(new NotReadyError('Pipeline run name is missing'));
    }
    return getK8sPipelineRun(name, namespace);
  }, [name, namespace]);

  return useFetchState(callback, null);
};

export default useK8sPipelinesRun;

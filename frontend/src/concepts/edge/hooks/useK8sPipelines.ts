import React from 'react';
import useFetchState, { FetchStateCallbackPromise, NotReadyError } from '~/utilities/useFetchState';
import { PipelineKind } from '~/k8sTypes';
import { getK8sPipeline } from '~/api';

const useK8sPipelines = (namespace: string, name?: string) => {
  const callback = React.useCallback<FetchStateCallbackPromise<PipelineKind | null>>(() => {
    if (!name) {
      return Promise.reject(new NotReadyError('Pipeline name is missing'));
    }
    return getK8sPipeline(name, namespace);
  }, [name, namespace]);

  return useFetchState(callback, null);
};

export default useK8sPipelines;

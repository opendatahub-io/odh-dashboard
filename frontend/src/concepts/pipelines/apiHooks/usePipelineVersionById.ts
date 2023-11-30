import * as React from 'react';
import useFetchState, { FetchStateCallbackPromise, NotReadyError } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineVersionKF } from '~/concepts/pipelines/kfTypes';

const usePipelineVersionById = (pipelineVersionId?: string) => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineVersionKF | null>>(
    (opts) => {
      if (!pipelineVersionId) {
        return Promise.reject(new NotReadyError('No pipeline version id'));
      }

      return api.getPipelineVersion(opts, pipelineVersionId);
    },
    [api, pipelineVersionId],
  );

  return useFetchState(call, null);
};

export default usePipelineVersionById;

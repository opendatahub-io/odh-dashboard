import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';

const usePipelineVersionById = (
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): FetchState<PipelineVersionKF | null> => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineVersionKF | null>>(
    (opts) => {
      if (!pipelineId) {
        return Promise.reject(new NotReadyError('No pipeline id'));
      }
      if (!pipelineVersionId) {
        return Promise.reject(new NotReadyError('No pipeline version id'));
      }

      return api.getPipelineVersion(opts, pipelineId, pipelineVersionId);
    },
    [api, pipelineId, pipelineVersionId],
  );

  return useFetchState(call, null);
};

export default usePipelineVersionById;

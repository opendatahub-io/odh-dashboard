import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';

const usePipelineVersionById = (
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): FetchState<PipelineVersionKFv2 | null> => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineVersionKFv2 | null>>(
    (opts) => {
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

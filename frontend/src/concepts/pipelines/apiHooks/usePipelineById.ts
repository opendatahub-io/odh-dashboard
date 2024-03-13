import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';

const usePipelineById = (pipelineId?: string): FetchState<PipelineKFv2 | null> => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineKFv2 | null>>(
    (opts) => {
      if (!pipelineId) {
        return Promise.reject(new NotReadyError('No pipeline id'));
      }

      return api.getPipeline(opts, pipelineId);
    },
    [api, pipelineId],
  );

  return useFetchState(call, null);
};

export default usePipelineById;

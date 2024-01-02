import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunJobKF } from '~/concepts/pipelines/kfTypes';

const usePipelineById = (pipelineRunJobId?: string): FetchState<PipelineRunJobKF | null> => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineRunJobKF | null>>(
    (opts) => {
      if (!pipelineRunJobId) {
        return Promise.reject(new NotReadyError('No pipeline run job id'));
      }

      return api.getPipelineRunJob(opts, pipelineRunJobId);
    },
    [api, pipelineRunJobId],
  );

  return useFetchState(call, null);
};

export default usePipelineById;

import * as React from 'react';
import useFetchState, { FetchStateCallbackPromise, NotReadyError } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunResourceKF } from '~/concepts/pipelines/kfTypes';

const usePipelineById = (pipelineRunId?: string) => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineRunResourceKF | null>>(
    (opts) => {
      if (!pipelineRunId) {
        return Promise.reject(new NotReadyError('No pipeline run id'));
      }

      return api.getPipelineRun(opts, pipelineRunId);
    },
    [api, pipelineRunId],
  );

  return useFetchState(call, null);
};

export default usePipelineById;

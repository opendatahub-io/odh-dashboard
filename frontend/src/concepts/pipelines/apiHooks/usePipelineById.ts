import * as React from 'react';
import useFetchState, { FetchStateCallbackPromise, NotReadyError } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';

const usePipelineById = (pipelineId?: string) => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineKF | null>>(
    (opts) => {
      if (!pipelineId) {
        return Promise.reject(new NotReadyError('No pipeline id'));
      }

      return new Promise((resolve, reject) => {
        api
          .getPipeline(opts, pipelineId)
          .then((pipeline) => {
            resolve(pipeline);
          })
          .catch(reject);
      });
    },
    [api, pipelineId],
  );

  return useFetchState(call, null);
};

export default usePipelineById;

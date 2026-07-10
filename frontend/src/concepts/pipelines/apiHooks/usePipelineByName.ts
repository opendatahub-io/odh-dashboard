import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetchState';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineKF } from '#~/concepts/pipelines/kfTypes';

export const usePipelineByName = (pipelineName: string): FetchState<PipelineKF | null> => {
  const { api } = usePipelinesAPI();
  const call = React.useCallback<FetchStateCallbackPromise<PipelineKF | null>>(
    async (opts) => {
      if (!pipelineName) {
        return Promise.reject(new NotReadyError('No pipeline name'));
      }
      return api.getPipelineByName(opts, pipelineName);
    },
    [api, pipelineName],
  );
  return useFetchState(call, null);
};

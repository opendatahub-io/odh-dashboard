import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRecurringRunKF } from '~/concepts/pipelines/kfTypes';

const usePipelineRecurringRunById = (
  pipelineRecurringRunByIdId?: string,
): FetchState<PipelineRecurringRunKF | null> => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineRecurringRunKF | null>>(
    (opts) => {
      if (!pipelineRecurringRunByIdId) {
        return Promise.reject(new NotReadyError('No pipeline recurring run id'));
      }

      return api.getPipelineRecurringRun(opts, pipelineRecurringRunByIdId);
    },
    [api, pipelineRecurringRunByIdId],
  );

  return useFetchState(call, null);
};

export default usePipelineRecurringRunById;

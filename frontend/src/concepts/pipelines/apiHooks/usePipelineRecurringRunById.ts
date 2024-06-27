import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRecurringRunKFv2 } from '~/concepts/pipelines/kfTypes';

const usePipelineRecurringRunById = (
  pipelineRecurringRunByIdId?: string,
): FetchState<PipelineRecurringRunKFv2 | null> => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineRecurringRunKFv2 | null>>(
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

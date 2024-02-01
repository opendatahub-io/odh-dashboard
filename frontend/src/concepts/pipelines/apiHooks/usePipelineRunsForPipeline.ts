import * as React from 'react';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { POLL_INTERVAL } from '~/utilities/const';

const usePipelineRunsForPipeline = (
  pipelineId: string,
  limit: number,
): FetchState<PipelineRunKF[]> => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineRunKF[]>>(
    (opts) =>
      api.listPipelineRunsByPipeline(opts, pipelineId, limit).then(({ runs }) => runs ?? []),
    [api, pipelineId, limit],
  );

  return useFetchState(call, [], { refreshRate: POLL_INTERVAL });
};

export default usePipelineRunsForPipeline;

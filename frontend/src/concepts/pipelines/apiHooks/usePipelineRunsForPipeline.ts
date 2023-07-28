import * as React from 'react';
import { PipelineKF, PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import useFetchState, { FetchStateCallbackPromise } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { POLL_INTERVAL } from '~/utilities/const';

const usePipelineRunsForPipeline = (pipeline: PipelineKF, limit: number) => {
  const { api } = usePipelinesAPI();

  const pipelineId = pipeline.id;
  const call = React.useCallback<FetchStateCallbackPromise<PipelineRunKF[]>>(
    (opts) =>
      api.listPipelineRunsByPipeline(opts, pipelineId, limit).then(({ runs }) => runs ?? []),
    [api, pipelineId, limit],
  );

  return useFetchState(call, [], { refreshRate: POLL_INTERVAL });
};

export default usePipelineRunsForPipeline;

import * as React from 'react';
import { PipelineKF, PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import useFetchState, { FetchStateCallbackPromise } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineRefreshHack from '~/concepts/pipelines/apiHooks/usePipelineRefreshHack';
import { POLL_INTERVAL } from '~/utilities/const';

const usePipelineRunsForPipeline = (pipeline: PipelineKF) => {
  const { api } = usePipelinesAPI();

  const pipelineId = pipeline.id;
  const call = React.useCallback<FetchStateCallbackPromise<PipelineRunKF[]>>(
    (opts) => api.listPipelineRunsByPipeline(opts, pipelineId).then(({ runs }) => runs ?? []),
    [api, pipelineId],
  );

  return usePipelineRefreshHack(useFetchState(call, [], { refreshRate: POLL_INTERVAL }));
};

export default usePipelineRunsForPipeline;

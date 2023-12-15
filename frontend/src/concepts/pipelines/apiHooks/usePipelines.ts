import * as React from 'react';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '~/utilities/useFetchState';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import { POLL_INTERVAL } from '~/utilities/const';

const usePipelines = (limit?: number): FetchState<PipelineKF[]> => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineKF[]>>(
    (opts) => api.listPipelines(opts, limit).then(({ pipelines }) => pipelines ?? []),
    [api, limit],
  );

  return useFetchState(call, [], { refreshRate: POLL_INTERVAL });
};

export default usePipelines;

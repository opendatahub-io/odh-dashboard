import * as React from 'react';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import useFetchState, { FetchStateCallbackPromise } from '~/utilities/useFetchState';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import { POLL_INTERVAL } from '~/utilities/const';
import usePipelineRefreshHack from '~/concepts/pipelines/apiHooks/usePipelineRefreshHack';

const usePipelines = (limit?: number) => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineKF[]>>(
    (opts) => api.listPipelines(opts, limit).then(({ pipelines }) => pipelines ?? []),
    [api, limit],
  );

  return usePipelineRefreshHack(useFetchState(call, [], { refreshRate: POLL_INTERVAL }));
};

export default usePipelines;

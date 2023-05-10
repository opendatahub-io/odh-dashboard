import * as React from 'react';
import { PipelineRunJobKF } from '~/concepts/pipelines/kfTypes';
import useFetchState, { FetchStateCallbackPromise } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { POLL_INTERVAL } from '~/utilities/const';

const usePipelineRunJobs = () => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineRunJobKF[]>>(
    (opts) => api.listPipelineRunJobs(opts).then(({ jobs }) => jobs ?? []),
    [api],
  );

  return useFetchState(call, [], { refreshRate: POLL_INTERVAL });
};

export default usePipelineRunJobs;

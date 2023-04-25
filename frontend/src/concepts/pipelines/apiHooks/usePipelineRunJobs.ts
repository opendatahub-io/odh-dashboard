import * as React from 'react';
import { PipelineRunJobKF } from '~/concepts/pipelines/kfTypes';
import useFetchState, { FetchStateCallbackPromise } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineRefreshHack from '~/concepts/pipelines/apiHooks/usePipelineRefreshHack';
import { POLL_INTERVAL } from '~/utilities/const';

const usePipelineRunJobs = () => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineRunJobKF[]>>(
    (opts) =>
      new Promise((resolve, reject) => {
        api
          .listPipelineRunJobs(opts)
          .then(({ jobs }) => resolve(jobs ?? []))
          .catch(reject);
      }),
    [api],
  );

  return usePipelineRefreshHack(useFetchState(call, [], { refreshRate: POLL_INTERVAL }));
};

export default usePipelineRunJobs;

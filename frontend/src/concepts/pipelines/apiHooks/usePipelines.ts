import * as React from 'react';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import useFetchState, { FetchStateCallbackPromise } from '~/utilities/useFetchState';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import { POLL_INTERVAL } from '~/utilities/const';
import usePipelineRefreshHack from '~/concepts/pipelines/apiHooks/usePipelineRefreshHack';

const usePipelines = (limit?: number) => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineKF[]>>(
    (opts) =>
      new Promise((resolve, reject) => {
        api
          .listPipelines(opts, limit)
          .then(({ pipelines }) => {
            resolve(pipelines ?? []);
          })
          .catch(reject);
      }),
    [api, limit],
  );

  return usePipelineRefreshHack(useFetchState(call, [], { refreshRate: POLL_INTERVAL }));
};

export default usePipelines;

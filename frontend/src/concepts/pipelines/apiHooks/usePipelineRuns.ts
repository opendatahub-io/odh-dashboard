import * as React from 'react';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import useFetchState, { FetchStateCallbackPromise } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineRefreshHack from '~/concepts/pipelines/apiHooks/usePipelineRefreshHack';
import { POLL_INTERVAL } from '~/utilities/const';

const usePipelineRuns = () => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineRunKF[]>>(
    (opts) =>
      new Promise((resolve, reject) => {
        api
          .listPipelineRuns(opts)
          .then(({ runs }) => resolve(runs ?? []))
          .catch(reject);
      }),
    [api],
  );

  return usePipelineRefreshHack(useFetchState(call, [], { refreshRate: POLL_INTERVAL }));
};

export default usePipelineRuns;

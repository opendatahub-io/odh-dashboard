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
    (opts) =>
      new Promise((resolve, reject) => {
        api
          .listPipelineRunsByPipeline(opts, pipelineId)
          .then(({ runs }) => resolve(runs ?? []))
          .catch(reject);
      }),
    [api, pipelineId],
  );

  return usePipelineRefreshHack(useFetchState(call, [], { refreshRate: POLL_INTERVAL }));
};

export default usePipelineRunsForPipeline;

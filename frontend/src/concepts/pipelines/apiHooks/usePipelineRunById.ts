import * as React from 'react';
import useFetchState, { FetchStateCallbackPromise, NotReadyError } from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunResourceKF, PipelineRunStatusesKF } from '~/concepts/pipelines/kfTypes';
import { FAST_POLL_INTERVAL } from '~/utilities/const';
import { computeRunStatus } from '~/concepts/pipelines/content/utils';

const usePipelineById = (pipelineRunId?: string, refreshForDetails?: boolean) => {
  const { api } = usePipelinesAPI();
  const [pipelineFinished, setPipelineFinished] = React.useState(false);

  const call = React.useCallback<FetchStateCallbackPromise<PipelineRunResourceKF | null>>(
    (opts) => {
      if (!pipelineRunId) {
        return Promise.reject(new NotReadyError('No pipeline run id'));
      }

      return api.getPipelineRun(opts, pipelineRunId);
    },
    [api, pipelineRunId],
  );

  const data = useFetchState(call, null, {
    refreshRate: !pipelineFinished && refreshForDetails ? FAST_POLL_INTERVAL : undefined,
  });

  const value = data[0]?.run;
  const { label } = computeRunStatus(value);
  const isComplete = [
    PipelineRunStatusesKF.COMPLETED,
    PipelineRunStatusesKF.FAILED,
    PipelineRunStatusesKF.CANCELLED,
  ].includes(label as PipelineRunStatusesKF);
  React.useEffect(() => {
    if (isComplete) {
      setPipelineFinished(true);
    }
  }, [isComplete]);

  return data;
};

export default usePipelineById;

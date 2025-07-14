import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineRunKF, RuntimeStateKF, runtimeStateLabels } from '#~/concepts/pipelines/kfTypes';
import { FAST_POLL_INTERVAL } from '#~/utilities/const';
import { computeRunStatus } from '#~/concepts/pipelines/content/utils';

export const isPipelineRunFinished = (run?: PipelineRunKF | null): boolean => {
  const { label } = computeRunStatus(run);
  return [
    runtimeStateLabels[RuntimeStateKF.SUCCEEDED],
    runtimeStateLabels[RuntimeStateKF.FAILED],
    runtimeStateLabels[RuntimeStateKF.CANCELED],
  ].includes(label);
};

const usePipelineRunById = (
  pipelineRunId?: string,
  refreshForDetails?: boolean,
): FetchState<PipelineRunKF | null> => {
  const { api } = usePipelinesAPI();
  const [pipelineFinished, setPipelineFinished] = React.useState(false);

  const call = React.useCallback<FetchStateCallbackPromise<PipelineRunKF | null>>(
    (opts) => {
      if (!pipelineRunId) {
        return Promise.reject(new NotReadyError('No pipeline run id'));
      }

      return api.getPipelineRun(opts, pipelineRunId);
    },
    [api, pipelineRunId],
  );

  const runData = useFetchState(call, null, {
    refreshRate: !pipelineFinished && refreshForDetails ? FAST_POLL_INTERVAL : undefined,
  });

  const [run] = runData;
  const isFinished = isPipelineRunFinished(run);

  React.useEffect(() => {
    if (isFinished) {
      setPipelineFinished(true);
    }
  }, [isFinished]);

  return runData;
};

export default usePipelineRunById;

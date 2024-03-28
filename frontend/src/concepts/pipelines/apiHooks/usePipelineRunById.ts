import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunKFv2, RuntimeStateKF, runtimeStateLabels } from '~/concepts/pipelines/kfTypes';
import { FAST_POLL_INTERVAL } from '~/utilities/const';
import { computeRunStatus } from '~/concepts/pipelines/content/utils';

const usePipelineRunById = (
  pipelineRunId?: string,
  refreshForDetails?: boolean,
): FetchState<PipelineRunKFv2 | null> => {
  const { api } = usePipelinesAPI();
  const [pipelineFinished, setPipelineFinished] = React.useState(false);

  const call = React.useCallback<FetchStateCallbackPromise<PipelineRunKFv2 | null>>(
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
  const { label } = computeRunStatus(run);
  const isComplete = [
    runtimeStateLabels[RuntimeStateKF.SUCCEEDED],
    runtimeStateLabels[RuntimeStateKF.FAILED],
    runtimeStateLabels[RuntimeStateKF.CANCELED],
  ].includes(label);

  React.useEffect(() => {
    if (isComplete) {
      setPipelineFinished(true);
    }
  }, [isComplete]);

  return runData;
};

export default usePipelineRunById;

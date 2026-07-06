import { useExecutionsFromMlmdContext } from '#~/concepts/pipelines/apiHooks/mlmd/useExecutionsFromMlmdContext';
import { usePipelineRunMlmdContext } from '#~/concepts/pipelines/apiHooks/mlmd/usePipelineRunMlmdContext';
import { isPipelineRunFinished } from '#~/concepts/pipelines/apiHooks/usePipelineRunById';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { Execution } from '#~/third_party/mlmd';
import { FAST_POLL_INTERVAL } from '#~/utilities/const';

const useExecutionsForPipelineRun = (
  run: PipelineRunKF | null,
): [executions: Execution[], loaded: boolean, error?: Error] => {
  const isFinished = isPipelineRunFinished(run);
  const refreshRate = isFinished ? 0 : FAST_POLL_INTERVAL;
  // contextError means mlmd service is not available, no need to check executions
  const [context, , contextError] = usePipelineRunMlmdContext(run?.run_id, refreshRate);
  // executionsLoaded is the flag to show the spinner or not
  const [executions, executionsLoaded] = useExecutionsFromMlmdContext(context, refreshRate);

  return [executions, executionsLoaded, contextError];
};

export default useExecutionsForPipelineRun;

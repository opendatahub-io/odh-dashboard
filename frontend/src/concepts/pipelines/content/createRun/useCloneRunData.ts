import { useParams } from 'react-router-dom';
import usePipelineRunById from '~/concepts/pipelines/apiHooks/usePipelineRunById';
import { PipelineRecurringRunKFv2, PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import usePipelineRecurringRunById from '~/concepts/pipelines/apiHooks/usePipelineRecurringRunById';

const useCloneRunData = (): [
  run: PipelineRunKFv2 | PipelineRecurringRunKFv2 | null,
  loaded: boolean,
  error: Error | undefined,
] => {
  const { runId, recurringRunId } = useParams();
  const [run, runLoaded, runError] = usePipelineRunById(runId);
  const [recurringRun, recurringRunLoaded, recurringRunError] =
    usePipelineRecurringRunById(recurringRunId);

  if (recurringRunLoaded || recurringRunError) {
    return [recurringRun, recurringRunLoaded, recurringRunError];
  }
  if (runLoaded || runError) {
    return [run ?? null, runLoaded, runError];
  }

  return [null, false, undefined];
};

export default useCloneRunData;

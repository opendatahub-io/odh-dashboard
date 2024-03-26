import { useParams } from 'react-router-dom';
import usePipelineRunById from '~/concepts/pipelines/apiHooks/usePipelineRunById';
import { PipelineRunJobKFv2, PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import usePipelineRunJobById from '~/concepts/pipelines/apiHooks/usePipelineRunJobById';

const useCloneRunData = (): [
  run: PipelineRunKFv2 | PipelineRunJobKFv2 | null,
  loaded: boolean,
  error: Error | undefined,
] => {
  const { runId, recurringRunId } = useParams();
  const [run, runLoaded, runError] = usePipelineRunById(runId);
  const [job, jobLoaded, jobError] = usePipelineRunJobById(recurringRunId);

  if (jobLoaded || jobError) {
    return [job, jobLoaded, jobError];
  }
  if (runLoaded || runError) {
    return [run ?? null, runLoaded, runError];
  }

  return [null, false, undefined];
};

export default useCloneRunData;

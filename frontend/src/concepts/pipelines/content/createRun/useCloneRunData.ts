import { useParams } from 'react-router-dom';
import usePipelineRunById from '~/concepts/pipelines/apiHooks/usePipelineRunById';
import { PipelineRunJobKF, PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import usePipelineRunJobById from '~/concepts/pipelines/apiHooks/usePipelineRunJobById';

const useCloneRunData = (): [
  resource: PipelineRunKF | PipelineRunJobKF | null,
  loaded: boolean,
  error: Error | undefined,
] => {
  const { pipelineRunId, pipelineRunJobId } = useParams();
  const [runResource, runLoaded, runError] = usePipelineRunById(pipelineRunId);
  const [job, jobLoaded, jobError] = usePipelineRunJobById(pipelineRunJobId);

  if (jobLoaded || jobError) {
    return [job, jobLoaded, jobError];
  }
  if (runLoaded || runError) {
    return [runResource?.run ?? null, runLoaded, runError];
  }

  return [null, false, undefined];
};

export default useCloneRunData;

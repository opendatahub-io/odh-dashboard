import { useParams } from 'react-router-dom';
import usePipelineRunById from '~/concepts/pipelines/apiHooks/usePipelineRunById';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
// import usePipelineRunJobById from '~/concepts/pipelines/apiHooks/usePipelineRunJobById';

const useCloneRunData = (): [
  run: PipelineRunKFv2 | null,
  loaded: boolean,
  error: Error | undefined,
] => {
  // TODO, https://issues.redhat.com/browse/RHOAIENG-2273
  // const { pipelineRunId, pipelineRunJobId } = useParams();
  const { pipelineRunId } = useParams();
  const [run, runLoaded, runError] = usePipelineRunById(pipelineRunId);
  // TODO, https://issues.redhat.com/browse/RHOAIENG-2273
  // const [job, jobLoaded, jobError] = usePipelineRunJobById(pipelineRunJobId);

  // if (jobLoaded || jobError) {
  //   return [job, jobLoaded, jobError];
  // }
  if (runLoaded || runError) {
    return [run ?? null, runLoaded, runError];
  }

  return [null, false, undefined];
};

export default useCloneRunData;

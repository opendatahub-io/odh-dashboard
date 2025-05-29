import { useArtifactsFromMlmdContext } from '#~/concepts/pipelines/apiHooks/mlmd/useArtifactsFromMlmdContext';
import { usePipelineRunMlmdContext } from '#~/concepts/pipelines/apiHooks/mlmd/usePipelineRunMlmdContext';
import { isPipelineRunFinished } from '#~/concepts/pipelines/apiHooks/usePipelineRunById';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { Artifact } from '#~/third_party/mlmd';
import { FAST_POLL_INTERVAL } from '#~/utilities/const';

export const usePipelineRunArtifacts = (
  run: PipelineRunKF | null,
): [artifacts: Artifact[], loaded: boolean, error?: Error] => {
  const isFinished = isPipelineRunFinished(run);
  const refreshRate = isFinished ? 0 : FAST_POLL_INTERVAL;
  const [context, , contextError] = usePipelineRunMlmdContext(run?.run_id, refreshRate);
  const [artifacts, artifactsLoaded] = useArtifactsFromMlmdContext(context, refreshRate);

  return [artifacts, artifactsLoaded, contextError];
};

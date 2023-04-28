import {
  PipelineRunJobKF,
  PipelineRunKF,
  PipelineRunLikeKF,
  ResourceReferenceKF,
  ResourceTypeKF,
} from '~/concepts/pipelines/kfTypes';

export const sortRunsByCreated = (runs: PipelineRunKF[]) =>
  [...runs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

export const getLastRun = (runs: PipelineRunKF[]) => sortRunsByCreated(runs)[0];

export const getRunResourceReference = (
  runLike: PipelineRunLikeKF,
  type: ResourceTypeKF,
): ResourceReferenceKF | undefined =>
  runLike.resource_references?.find((ref) => ref.key.type === type);

export const getPipelineRunLikeExperimentName = (runLike: PipelineRunLikeKF): string =>
  getRunResourceReference(runLike, ResourceTypeKF.EXPERIMENT)?.name || 'Default';

export const getPipelineRunLikePipelineName = (runLike: PipelineRunLikeKF): string =>
  getRunResourceReference(runLike, ResourceTypeKF.PIPELINE_VERSION)?.name || '';

export const getPipelineRunJobStartTime = (job: PipelineRunJobKF): Date | null => {
  const startTime =
    job.trigger.cron_schedule?.start_time || job.trigger.periodic_schedule?.start_time;

  return startTime ? new Date(startTime) : null;
};

export const getPipelineRunJobEndTime = (job: PipelineRunJobKF): Date | null => {
  const endTime = job.trigger.cron_schedule?.end_time || job.trigger.periodic_schedule?.end_time;

  return endTime ? new Date(endTime) : null;
};

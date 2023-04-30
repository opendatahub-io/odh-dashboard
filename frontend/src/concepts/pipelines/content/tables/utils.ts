import {
  PipelineRunJobKF,
  PipelineRunKF,
  PipelineCoreResourceKF,
  PipelineRunStatusesKF,
  ResourceReferenceKF,
  ResourceTypeKF,
} from '~/concepts/pipelines/kfTypes';
import { DateRangeString, splitDateRange } from '~/components/dateRange/utils';

export const sortRunsByCreated = (runs: PipelineRunKF[]) =>
  [...runs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

export const getLastRun = (runs: PipelineRunKF[]) => sortRunsByCreated(runs)[0];

export const getRunDuration = (run: PipelineRunKF): number => {
  const finishedDate = new Date(run.finished_at);
  if (finishedDate.getFullYear() <= 1970) {
    // Kubeflow initial timestamp -- epoch, not an actual value
    return 0;
  }

  const createdDate = new Date(run.created_at);
  return finishedDate.getTime() - createdDate.getTime();
};

export const getStatusWeight = (run: PipelineRunKF): number => {
  const weights: Record<PipelineRunStatusesKF, number> = {
    [PipelineRunStatusesKF.CANCELLED]: 0,
    [PipelineRunStatusesKF.COMPLETED]: 1,
    [PipelineRunStatusesKF.FAILED]: 2,
    [PipelineRunStatusesKF.RUNNING]: 3,
  };

  return weights[run.status] ?? 0;
};

export const getRunResourceReference = (
  runLike: PipelineCoreResourceKF,
  type: ResourceTypeKF,
): ResourceReferenceKF | undefined =>
  runLike.resource_references?.find((ref) => ref.key.type === type);

export const getPipelineRunLikePipelineReference = (
  runLike: PipelineCoreResourceKF,
): ResourceReferenceKF | undefined =>
  getRunResourceReference(runLike, ResourceTypeKF.PIPELINE_VERSION);

export const getPipelineRunLikeExperimentReference = (
  runLike: PipelineCoreResourceKF,
): ResourceReferenceKF | undefined => getRunResourceReference(runLike, ResourceTypeKF.EXPERIMENT);

export const getPipelineRunLikeExperimentName = (runLike: PipelineCoreResourceKF): string =>
  getPipelineRunLikeExperimentReference(runLike)?.name || 'Default';

export const getPipelineRunLikePipelineName = (runLike: PipelineCoreResourceKF): string =>
  getPipelineRunLikePipelineReference(runLike)?.name || '';

export const getPipelineRunJobStartTime = (job: PipelineRunJobKF): Date | null => {
  const startTime =
    job.trigger.cron_schedule?.start_time || job.trigger.periodic_schedule?.start_time;

  return startTime ? new Date(startTime) : null;
};

export const getPipelineRunJobEndTime = (job: PipelineRunJobKF): Date | null => {
  const endTime = job.trigger.cron_schedule?.end_time || job.trigger.periodic_schedule?.end_time;

  return endTime ? new Date(endTime) : null;
};

export enum ScheduledState {
  NOT_STARTED,
  UNBOUNDED_END,
  STARTED_NOT_ENDED,
  ENDED,
}

const inPast = (date: Date | null): boolean => (date ? date.getTime() - Date.now() <= 0 : false);
export const getPipelineRunJobScheduledState = (
  job: PipelineRunJobKF,
): [state: ScheduledState, started: Date | null, ended: Date | null] => {
  const startDate = getPipelineRunJobStartTime(job);
  const endDate = getPipelineRunJobEndTime(job);
  const startDateInPast = inPast(startDate);
  const endDateInPast = inPast(endDate);

  let state: ScheduledState;
  if (!startDate || startDateInPast) {
    if (!endDate) {
      state = ScheduledState.UNBOUNDED_END;
    } else if (endDateInPast) {
      state = ScheduledState.ENDED;
    } else {
      state = ScheduledState.STARTED_NOT_ENDED;
    }
  } else {
    state = ScheduledState.NOT_STARTED;
  }

  return [state, startDate, endDate];
};

export const getScheduledStateWeight = (job: PipelineRunJobKF): number => {
  const [state] = getPipelineRunJobScheduledState(job);

  const weights: Record<ScheduledState, number> = {
    [ScheduledState.UNBOUNDED_END]: 0,
    [ScheduledState.STARTED_NOT_ENDED]: 1,
    [ScheduledState.NOT_STARTED]: 2,
    [ScheduledState.ENDED]: 3,
  };

  return weights[state] ?? 0;
};

export const isJobWithinDateRange = (
  job: PipelineRunJobKF,
  dateRange: DateRangeString,
): boolean => {
  const jobStart = getPipelineRunJobStartTime(job);
  const jobEnd = getPipelineRunJobEndTime(job);

  if (!jobStart && !jobEnd) {
    // No start or end, it's within'
    return true;
  }
  const jobStartNumber = jobStart?.getTime() ?? 0;
  const jobEndNumber = jobEnd?.getTime() ?? Infinity;

  const [startValue, endValue] = splitDateRange(dateRange);
  const startNumber = startValue ? new Date(startValue).getTime() : 0;
  const endNumber = endValue ? new Date(endValue).getTime() : Infinity;

  return (
    (startNumber >= jobStartNumber && startNumber <= jobEndNumber) ||
    (endNumber >= jobStartNumber && endNumber <= jobEndNumber)
  );
};

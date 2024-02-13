import {
  PipelineRunJobKFv2,
  PipelineRunKFv2,
  PipelineRunStatusesKF,
  PipelineCoreResourceKF,
  ResourceTypeKF,
  ResourceReferenceKF,
  PipelineRunKF,
} from '~/concepts/pipelines/kfTypes';
import { DateRangeString, splitDateRange } from '~/components/dateRange/utils';

export const getLastRun = (runs: PipelineRunKFv2[]): PipelineRunKFv2 | undefined => runs[0];

export const getRunDuration = (run: PipelineRunKFv2): number => {
  const finishedDate = new Date(run.finished_at);
  if (finishedDate.getFullYear() <= 1970) {
    // Kubeflow initial timestamp -- epoch, not an actual value
    return 0;
  }

  const createdDate = new Date(run.created_at);
  return finishedDate.getTime() - createdDate.getTime();
};

/**
 * @deprecated
 *  v2 api now uses RuntimeStateKF
 */
export const getStatusWeight = (run: PipelineRunKF): number => {
  const weights: Record<PipelineRunStatusesKF | string, number | undefined> = {
    [PipelineRunStatusesKF.CANCELLED]: 0,
    [PipelineRunStatusesKF.COMPLETED]: 1,
    [PipelineRunStatusesKF.FAILED]: 2,
    [PipelineRunStatusesKF.RUNNING]: 3,
    [PipelineRunStatusesKF.STARTED]: 4,
  };

  return weights[run.status] ?? Infinity;
};

/**
 * @deprecated
 * Uses v1 api where resource references existed
 */
export const getResourceRef = (
  resource: PipelineCoreResourceKF | null | undefined,
  type: ResourceTypeKF,
): ResourceReferenceKF | undefined =>
  resource?.resource_references?.find((ref) => ref.key.type === type);

/**
 * @deprecated
 * Uses v1 api where resource references existed
 */
export const getJobResourceRef = (
  resource: Parameters<typeof getResourceRef>[0],
): ResourceReferenceKF | undefined => getResourceRef(resource, ResourceTypeKF.JOB);

/**
 * @deprecated
 * Uses v1 api where resource references existed
 */
export const getPipelineVersionResourceRef = (
  resource: PipelineCoreResourceKF | null | undefined,
): ResourceReferenceKF | undefined => getResourceRef(resource, ResourceTypeKF.PIPELINE_VERSION);

/**
 * @deprecated
 * Uses v1 api where resource references existed
 */
export const getPipelineResourceRef = (
  resource: PipelineCoreResourceKF | null,
): ResourceReferenceKF | undefined => getResourceRef(resource, ResourceTypeKF.PIPELINE);

/**
 * @deprecated
 * Uses v1 api where resource references existed
 */
export const getExperimentResourceRef = (
  resource: Parameters<typeof getResourceRef>[0],
): ResourceReferenceKF | undefined => getResourceRef(resource, ResourceTypeKF.EXPERIMENT);

export const getPipelineRunJobStartTime = (job: PipelineRunJobKFv2): Date | null => {
  const startTime =
    job.trigger.cron_schedule?.start_time || job.trigger.periodic_schedule?.start_time;

  return startTime ? new Date(startTime) : null;
};

export const getPipelineRunJobEndTime = (job: PipelineRunJobKFv2): Date | null => {
  const endTime = job.trigger.cron_schedule?.end_time || job.trigger.periodic_schedule?.end_time;

  return endTime ? new Date(endTime) : null;
};

export enum ScheduledState {
  NOT_STARTED,
  UNBOUNDED_END,
  STARTED_NOT_ENDED,
  ENDED,
}
export enum PipelineRunLabels {
  RECURRING = 'Recurring',
  ONEOFF = 'One-off',
}
export enum PipelineType {
  SCHEDULED_RUN = 'scheduled run',
  TRIGGERED_RUN = 'triggered run',
}
const inPast = (date: Date | null): boolean => (date ? date.getTime() - Date.now() <= 0 : false);
export const getPipelineRunJobScheduledState = (
  job: PipelineRunJobKFv2,
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

export const getScheduledStateWeight = (job: PipelineRunJobKFv2): number => {
  const [state] = getPipelineRunJobScheduledState(job);

  const weights: Record<ScheduledState, number> = {
    [ScheduledState.UNBOUNDED_END]: 0,
    [ScheduledState.STARTED_NOT_ENDED]: 1,
    [ScheduledState.NOT_STARTED]: 2,
    [ScheduledState.ENDED]: 3,
  };

  return weights[state];
};

export const isJobWithinDateRange = (
  job: PipelineRunJobKFv2,
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

export const getPipelineJobExecutionCount = (resourceName: string): string | null => {
  const regex = /(\w+)(?:-[^-]*)?$/;
  const match = resourceName?.match(regex);
  return match ? match[1] : null;
};

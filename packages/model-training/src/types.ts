import { TrainJobKind, RayJobKind } from './k8sTypes';

export enum TrainingJobState {
  CREATED = 'Created',
  PENDING = 'Pending',
  QUEUED = 'Queued',
  RUNNING = 'Running',
  RESTARTING = 'Restarting',
  SUCCEEDED = 'Succeeded',
  FAILED = 'Failed',
  PAUSED = 'Paused',
  SUSPENDED = 'Suspended',
  PREEMPTED = 'Preempted',
  INADMISSIBLE = 'Inadmissible',
  DELETING = 'Deleting',
  UNKNOWN = 'Unknown',
  COMPLETE = 'Complete',
}

export enum RayJobStatusValue {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export enum RayJobState {
  RUNNING = 'Running',
  FAILED = 'Failed',
  SUCCEEDED = 'Succeeded',
  PAUSED = 'Paused',
  PENDING = 'Pending',
  QUEUED = 'Queued',
  INADMISSIBLE = 'Inadmissible',
  PREEMPTED = 'Preempted',
  DELETING = 'Deleting',
  UNKNOWN = 'Unknown',
}

export type JobDisplayState = TrainingJobState | RayJobState;

export enum RayJobDeploymentStatus {
  INITIALIZING = 'Initializing',
  RUNNING = 'Running',
  COMPLETE = 'Complete',
  FAILED = 'Failed',
  VALIDATION_FAILED = 'ValidationFailed',
  SUSPENDING = 'Suspending',
  SUSPENDED = 'Suspended',
  RETRYING = 'Retrying',
  WAITING = 'Waiting',
}

export enum JobType {
  TRAIN_JOB = 'TrainJob',
  RAY_JOB = 'RayJob',
}

export type UnifiedJobKind = TrainJobKind | RayJobKind;

export const isRayJob = (job: UnifiedJobKind): job is RayJobKind => job.kind === 'RayJob';

export const isTrainJob = (job: UnifiedJobKind): job is TrainJobKind => job.kind === 'TrainJob';

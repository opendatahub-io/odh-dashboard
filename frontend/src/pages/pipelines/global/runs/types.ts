import { ExperimentKF, PipelineRunKF } from '~/concepts/pipelines/kfTypes';

export enum PipelineRunType {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  SCHEDULED = 'scheduled',
}

export enum PipelineRunTabTitle {
  ACTIVE = 'Runs',
  ARCHIVED = 'Archive',
  SCHEDULES = 'Schedules',
}

export type PipelineResourceRestoreResult = true | Error | undefined;

export type ExperimentStatus = {
  experiment: ExperimentKF;
  status: PipelineResourceRestoreResult;
};

export type RunStatus = {
  run: PipelineRunKF;
  status: PipelineResourceRestoreResult;
};

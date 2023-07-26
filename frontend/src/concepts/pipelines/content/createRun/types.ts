import { ProjectKind } from '~/k8sTypes';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';

export enum RunTypeOption {
  ONE_TRIGGER = 'run',
  SCHEDULED = 'job',
}
export enum ScheduledType {
  PERIODIC = 'periodic',
  CRON = 'cron',
}

export enum PeriodicOptions {
  MINUTE = 'Minute',
  HOUR = 'Hour',
  DAY = 'Day',
  WEEK = 'Week',
}
export const periodicOptionAsSeconds: Record<PeriodicOptions, number> = {
  [PeriodicOptions.MINUTE]: 60,
  [PeriodicOptions.HOUR]: 60 * 60,
  [PeriodicOptions.DAY]: 24 * 60 * 60,
  [PeriodicOptions.WEEK]: 7 * 24 * 60 * 60,
};

export type RunDateTime = { date: string; time: string };
export type RunTypeScheduledData = {
  triggerType: ScheduledType;
  value: string;
  start?: RunDateTime;
  end?: RunDateTime;
};

export type RunType =
  | { type: RunTypeOption.ONE_TRIGGER }
  | { type: RunTypeOption.SCHEDULED; data: RunTypeScheduledData };

export type RunParam = {
  label: string;
  value: string;
};

export type RunFormData = {
  project: ProjectKind;
  nameDesc: { name: string; description: string };
  pipelinesLoaded: boolean;
  pipeline: PipelineKF | null;
  // experiment: ExperimentKF | null;
  runType: RunType;
  params?: RunParam[];
};

export type SafeRunFormData = RunFormData & {
  pipeline: PipelineKF;
  // experiment: ExperimentKF;
  params: RunParam[];
};

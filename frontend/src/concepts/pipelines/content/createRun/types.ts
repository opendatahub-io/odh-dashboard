import { ProjectKind } from '~/k8sTypes';
import {
  ExperimentKF,
  PipelineKF,
  PipelineVersionKF,
  RuntimeConfigParameters,
} from '~/concepts/pipelines/kfTypes';
import { PipelineRunType } from '~/pages/pipelines/global/runs/types';

export enum RunTypeOption {
  ONE_TRIGGER = 'run',
  SCHEDULED = 'schedule',
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
  catchUp: boolean;
  maxConcurrency: number;
  triggerType: ScheduledType;
  value: string;
  start?: RunDateTime;
  end?: RunDateTime;
};

export type OneTriggerRunType = { type: RunTypeOption.ONE_TRIGGER };
export type ScheduledRunType = { type: RunTypeOption.SCHEDULED; data: RunTypeScheduledData };

export type RunType = OneTriggerRunType | ScheduledRunType;

export enum PipelineVersionToUse {
  LATEST = 'latest',
  PROVIDED = 'provided',
}

export type RunFormData = {
  project: ProjectKind;
  nameDesc: { name: string; description: string };
  pipeline: PipelineKF | null;
  version: PipelineVersionKF | null;
  versionToUse: PipelineVersionToUse;
  experiment: ExperimentKF | null;
  runType: RunType;
  params?: RuntimeConfigParameters;
};

export type SafeRunFormData = RunFormData & {
  pipeline: PipelineKF;
  params: RuntimeConfigParameters;
};

export const runTypeCategory: Record<PipelineRunType, 'run' | 'schedule'> = {
  [PipelineRunType.ACTIVE]: 'run',
  [PipelineRunType.ARCHIVED]: 'run',
  [PipelineRunType.SCHEDULED]: 'schedule',
};

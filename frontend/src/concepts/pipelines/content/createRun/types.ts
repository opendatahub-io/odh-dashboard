import { ProjectKind } from '~/k8sTypes';
import {
  ExperimentKFv2,
  PipelineKFv2,
  PipelineVersionKFv2,
  RuntimeConfigParameters,
} from '~/concepts/pipelines/kfTypes';
import { PipelineRunType } from '~/pages/pipelines/global/runs';

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

export type RunFormData = {
  project: ProjectKind;
  nameDesc: { name: string; description: string };
  pipeline: PipelineKFv2 | null;
  version: PipelineVersionKFv2 | null;
  experiment: ExperimentKFv2 | null;
  runType: RunType;
  params?: RuntimeConfigParameters;
};

export type SafeRunFormData = RunFormData & {
  pipeline: PipelineKFv2;
  params: RuntimeConfigParameters;
};

export const runTypeCategory: Record<PipelineRunType, 'run' | 'schedule'> = {
  [PipelineRunType.ACTIVE]: 'run',
  [PipelineRunType.ARCHIVED]: 'run',
  [PipelineRunType.SCHEDULED]: 'schedule',
};

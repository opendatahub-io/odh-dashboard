import {
  PeriodicOptions,
  RunTypeScheduledData,
  ScheduledType,
} from '~/concepts/pipelines/content/createRun/types';

export const DEFAULT_CRON_STRING = '0 0 0 * * *';
export const DEFAULT_PERIODIC_OPTION = PeriodicOptions.WEEK;
export const DEFAULT_MAX_CONCURRENCY = 10;
export const DEFAULT_PERIODIC_DATA: RunTypeScheduledData = {
  catchUp: true,
  maxConcurrency: DEFAULT_MAX_CONCURRENCY,
  triggerType: ScheduledType.PERIODIC,
  value: DEFAULT_PERIODIC_OPTION,
};
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DEFAULT_TIME = '12:00 AM';
export const RUN_OPTION_LABEL_SIZE = 100;

export enum CreateRunPageSections {
  RUN_TYPE = 'run-section-run-type',
  PROJECT = 'run-section-project',
  NAME_DESC = 'run-section-name-desc',
  EXPERIMENT = 'run-section-experiment',
  PIPELINE = 'run-section-pipeline',
  PIPELINE_VERSION = 'run-section-pipeline-version',
  SCHEDULE_SETTINGS = 'run-section-schedule-settings',
  PARAMS = 'run-section-params',
}

export const runPageSectionTitles: Record<CreateRunPageSections, string> = {
  [CreateRunPageSections.RUN_TYPE]: 'Run type',
  [CreateRunPageSections.PROJECT]: 'Project',
  [CreateRunPageSections.NAME_DESC]: 'Name and description',
  [CreateRunPageSections.EXPERIMENT]: 'Experiment',
  [CreateRunPageSections.PIPELINE]: 'Pipeline',
  [CreateRunPageSections.PIPELINE_VERSION]: 'Pipeline version',
  [CreateRunPageSections.SCHEDULE_SETTINGS]: 'Schedule settings',
  [CreateRunPageSections.PARAMS]: 'Parameters',
};

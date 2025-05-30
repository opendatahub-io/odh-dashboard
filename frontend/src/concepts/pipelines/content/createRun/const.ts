import {
  PeriodicOptions,
  RunTypeScheduledData,
  ScheduledType,
} from '#~/concepts/pipelines/content/createRun/types';

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
  PROJECT_AND_EXPERIMENT = 'run-section-project-and-experiment',
  RUN_DETAILS = 'run-section-details',
  SCHEDULE_DETAILS = 'run-section-schedule-details',
  PIPELINE = 'run-section-pipeline',
  PARAMS = 'run-section-params',
}

export const runPageSectionTitles: Record<CreateRunPageSections, string> = {
  [CreateRunPageSections.RUN_TYPE]: 'Run type',
  [CreateRunPageSections.PROJECT_AND_EXPERIMENT]: 'Project and experiment',
  [CreateRunPageSections.RUN_DETAILS]: 'Run details',
  [CreateRunPageSections.SCHEDULE_DETAILS]: 'Schedule details',
  [CreateRunPageSections.PIPELINE]: 'Pipeline',
  [CreateRunPageSections.PARAMS]: 'Parameters',
};

import { PeriodicOptions } from '~/concepts/pipelines/content/createRun/types';

export const DEFAULT_CRON_STRING = '0 0 0 * * *';
export const DEFAULT_PERIODIC_OPTION = PeriodicOptions.WEEK;
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DEFAULT_TIME = '12:00 AM';

export enum CreateRunPageSections {
  NAME_DESC = 'run-section-name-desc',
  PIPELINE = 'run-section-pipeline',
  PIPELINE_VERSION = 'run-section-pipeline-version',
  // EXPERIMENT = 'run-section-experiment',
  RUN_TYPE = 'run-section-run-type',
  PARAMS = 'run-section-params',
}

export const runPageSectionTitles: Record<CreateRunPageSections, string> = {
  [CreateRunPageSections.NAME_DESC]: 'Name and description',
  [CreateRunPageSections.PIPELINE]: 'Pipeline',
  [CreateRunPageSections.PIPELINE_VERSION]: 'Pipeline version',
  // [CreateRunPageSections.EXPERIMENT]: 'Experiment',
  [CreateRunPageSections.RUN_TYPE]: 'Run type',
  [CreateRunPageSections.PARAMS]: 'Pipeline input parameters',
};

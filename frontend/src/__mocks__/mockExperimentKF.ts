/* eslint-disable camelcase */
import { ExperimentKF, StorageStateKF } from '#~/concepts/pipelines/kfTypes';

export const buildMockExperimentKF = (experiment?: Partial<ExperimentKF>): ExperimentKF => ({
  experiment_id: 'a9947051-ead5-480c-acca-fd26ae14b81b',
  display_name: 'Default',
  description: 'All runs created without specifying an experiment will be grouped here.',
  created_at: '2024-01-31T15:46:33Z',
  storage_state: StorageStateKF.AVAILABLE,
  last_run_created_at: '2024-01-31T15:46:33Z',
  ...experiment,
});

export const buildMockExperiments = (
  experiments: ExperimentKF[] = [buildMockExperimentKF()],
  totalSize?: number,
  nextPageToken?: string,
): {
  total_size?: number | undefined;
  next_page_token?: string | undefined;
  experiments: ExperimentKF[];
} => ({
  experiments,
  total_size: totalSize || experiments.length,
  next_page_token: nextPageToken,
});

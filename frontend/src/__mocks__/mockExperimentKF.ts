/* eslint-disable camelcase */
import { ExperimentKFv2, StorageStateKFv2 } from '~/concepts/pipelines/kfTypes';

export const buildMockExperimentKF = (experiment?: Partial<ExperimentKFv2>): ExperimentKFv2 => ({
  experiment_id: 'a9947051-ead5-480c-acca-fd26ae14b81b',
  display_name: 'Default',
  description: 'All runs created without specifying an experiment will be grouped here.',
  created_at: '2024-01-31T15:46:33Z',
  storage_state: StorageStateKFv2.AVAILABLE,
  ...experiment,
});

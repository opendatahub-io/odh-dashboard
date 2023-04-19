import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';

export const sortRunsByCreated = (runs: PipelineRunKF[]) =>
  [...runs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

export const getLastRun = (runs: PipelineRunKF[]) => sortRunsByCreated(runs)[0];

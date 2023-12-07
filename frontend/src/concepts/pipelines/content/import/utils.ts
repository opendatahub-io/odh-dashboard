import { PipelineKF } from '~/concepts/pipelines/kfTypes';

export const generatePipelineVersionName = (pipeline?: PipelineKF | null) =>
  pipeline ? `${pipeline.name}_version_at_${new Date().toISOString()}` : '';

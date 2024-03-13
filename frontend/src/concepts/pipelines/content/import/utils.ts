import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';

export const generatePipelineVersionName = (pipeline?: PipelineKFv2 | null): string =>
  pipeline ? `${pipeline.display_name}_version_at_${new Date().toISOString()}` : '';

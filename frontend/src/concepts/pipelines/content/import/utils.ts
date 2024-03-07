import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';

export const generatePipelineVersionName = (pipeline?: PipelineKFv2 | null): string =>
  pipeline ? `${pipeline.display_name}_version_at_${new Date().toISOString()}` : '';

export const COMPILE_PIPELINE_DOCUMENTATION_URL =
  'https://www.kubeflow.org/docs/components/pipelines/v2/compile-a-pipeline/';

export enum PipelineUploadOption {
  URL_IMPORT,
  FILE_UPLOAD,
}

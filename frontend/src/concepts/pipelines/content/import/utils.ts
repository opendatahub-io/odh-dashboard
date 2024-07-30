import YAML from 'yaml';
import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';

export const generatePipelineVersionName = (pipeline?: PipelineKFv2 | null): string =>
  pipeline ? `${pipeline.display_name}_version_at_${new Date().toISOString()}` : '';

export const COMPILE_PIPELINE_DOCUMENTATION_URL =
  'https://www.kubeflow.org/docs/components/pipelines/v2/compile-a-pipeline/';

export enum PipelineUploadOption {
  URL_IMPORT,
  FILE_UPLOAD,
}

// Utility function to extract Kind from Pipeline YAML
export const extractKindFromPipelineYAML = (yamlFile: string): string | undefined => {
  try {
    const parsedYaml = YAML.parse(yamlFile);
    return parsedYaml && parsedYaml.kind ? parsedYaml.kind : undefined;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error parsing YAML file:', e);
    return undefined;
  }
};

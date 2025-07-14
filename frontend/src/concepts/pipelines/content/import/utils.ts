import YAML from 'yaml';
import { PipelineKF } from '#~/concepts/pipelines/kfTypes';

export const generatePipelineVersionName = (pipeline?: PipelineKF | null): string =>
  pipeline ? `${pipeline.display_name}_version_at_${new Date().toISOString()}` : '';

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

export const isYAMLPipelineV1 = (yamlFile: string): boolean => {
  try {
    const parsedYaml = YAML.parse(yamlFile);
    return (
      parsedYaml &&
      parsedYaml.kind === 'PipelineRun' &&
      parsedYaml.apiVersion === 'tekton.dev/v1beta1'
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error parsing YAML file:', e);
    return false;
  }
};

import { extractKindFromPipelineYAML } from '#~/concepts/pipelines/content/import/utils';

describe('extractKindFromPipelineYAML', () => {
  test('should return kind when kind field is present', () => {
    const yamlFile = `
    apiVersion: argoproj.io/v1alpha1
    kind: Workflow
    metadata:
      name: example-workflow
    `;
    const result = extractKindFromPipelineYAML(yamlFile);
    expect(result).toBe('Workflow');
  });

  test('should return undefined when kind field is not present', () => {
    const yamlFile = `
    apiVersion: argoproj.io/v1alpha1
    metadata:
      name: example-workflow
    `;
    const result = extractKindFromPipelineYAML(yamlFile);
    expect(result).toBeUndefined();
  });

  test('should handle kind field with extra spaces', () => {
    const yamlFile = `
    apiVersion: argoproj.io/v1alpha1
    kind:     Workflow
    metadata:
      name: example-workflow
    `;
    const result = extractKindFromPipelineYAML(yamlFile);
    expect(result).toBe('Workflow');
  });

  test('should return undefined for an empty YAML string', () => {
    const yamlFile = '';
    const result = extractKindFromPipelineYAML(yamlFile);
    expect(result).toBeUndefined();
  });
});

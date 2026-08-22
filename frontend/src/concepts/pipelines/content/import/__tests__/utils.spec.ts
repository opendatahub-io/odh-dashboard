import {
  extractKindFromPipelineYAML,
  isValidPipelineUrl,
} from '#~/concepts/pipelines/content/import/utils';

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

describe('isValidPipelineUrl', () => {
  it('should return true for a valid https URL', () => {
    expect(isValidPipelineUrl('https://example.com/pipeline.yaml')).toBe(true);
  });

  it('should return true for a valid http URL', () => {
    expect(isValidPipelineUrl('http://example.com/pipeline.yaml')).toBe(true);
  });

  it('should return true for a URL with query params', () => {
    expect(isValidPipelineUrl('https://example.com/pipeline?version=1')).toBe(true);
  });

  it('should return true for a URL with a port', () => {
    expect(isValidPipelineUrl('https://example.com:8080/pipeline.yaml')).toBe(true);
  });

  it('should return false for an empty string', () => {
    expect(isValidPipelineUrl('')).toBe(false);
  });

  it('should return false for a plain string without protocol', () => {
    expect(isValidPipelineUrl('not-a-url')).toBe(false);
  });

  it('should return false for a string with only a domain', () => {
    expect(isValidPipelineUrl('example.com')).toBe(false);
  });

  it('should return false for a random string', () => {
    expect(isValidPipelineUrl('abc123!@#')).toBe(false);
  });

  it('should return false for a file:// protocol URL', () => {
    expect(isValidPipelineUrl('file:///etc/passwd')).toBe(false);
  });

  it('should return false for an ftp:// protocol URL', () => {
    expect(isValidPipelineUrl('ftp://example.com/file.yaml')).toBe(false);
  });

  it('should return false for a javascript: protocol URL', () => {
    // eslint-disable-next-line no-script-url
    expect(isValidPipelineUrl('javascript:alert(1)')).toBe(false);
  });
});

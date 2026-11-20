import { stringify } from 'yaml';
import { convertYamlToResources, isYamlDirty } from '../yamlUtils';

const resource = {
  apiVersion: 'v1',
  kind: 'ConfigMap',
  metadata: { name: 'test-resource', namespace: 'test-ns' },
  spec: {},
};

describe('convertYamlToResources', () => {
  it.each([
    resource,
    { ...resource, apiVersion: 'apps/v1', kind: 'Deployment', spec: { replicas: 2 } },
    {
      ...resource,
      apiVersion: 'serving.kserve.io/v1alpha2',
      kind: 'LLMInferenceService',
      spec: { model: { uri: 'hf://test/model' } },
    },
  ])('should accept $apiVersion/$kind resources', (model) => {
    expect(convertYamlToResources(stringify(model))).toStrictEqual({ resources: { model } });
  });

  it('should preserve resource-specific fields and additional metadata', () => {
    const model = {
      ...resource,
      metadata: {
        ...resource.metadata,
        annotations: { 'example.com/custom': 'value' },
        labels: { app: 'test' },
        finalizers: ['example.com/cleanup'],
        resourceVersion: '123',
      },
      data: { setting: 'value' },
      status: { custom: true },
    };

    expect(convertYamlToResources(stringify(model))).toStrictEqual({ resources: { model } });
  });

  it.each([{ model: { uri: 42 } }, { replicas: 2, args: ['--foo'], extras: null }])(
    'should leave spec contents validation to extensions: %j',
    (spec) => {
      const model = { ...resource, kind: 'LLMInferenceService', spec };
      expect(convertYamlToResources(stringify(model))).toStrictEqual({ resources: { model } });
    },
  );

  it.each([undefined, '', ' \n\t'])('should reject empty YAML: %j', (yaml) => {
    expect(convertYamlToResources(yaml)).toStrictEqual({
      resources: { model: undefined },
      error: new Error('YAML cannot be empty'),
    });
  });

  it.each(['null', '# comment only', '42', 'true', 'text', '[]', '- kind: ConfigMap'])(
    'should reject YAML without a resource object: %s',
    (yaml) => {
      const result = convertYamlToResources(yaml);
      expect(result.resources.model).toBeUndefined();
      expect(result.error?.message).toContain('Invalid Kubernetes resource YAML: resource:');
    },
  );

  it.each([
    ['apiVersion', { ...resource, apiVersion: undefined }],
    ['apiVersion', { ...resource, apiVersion: '' }],
    ['apiVersion', { ...resource, apiVersion: 1 }],
    ['kind', { ...resource, kind: undefined }],
    ['kind', { ...resource, kind: '' }],
    ['kind', { ...resource, kind: 1 }],
    ['metadata', { ...resource, metadata: undefined }],
    ['metadata', { ...resource, metadata: null }],
    ['metadata', { ...resource, metadata: 'invalid' }],
    ['metadata', { ...resource, metadata: [] }],
    ['metadata.name', { ...resource, metadata: { namespace: 'test-ns' } }],
    ['metadata.name', { ...resource, metadata: { ...resource.metadata, name: '' } }],
    ['metadata.name', { ...resource, metadata: { ...resource.metadata, name: 42 } }],
    ['metadata.namespace', { ...resource, metadata: { name: 'test-resource' } }],
    ['metadata.namespace', { ...resource, metadata: { ...resource.metadata, namespace: '' } }],
    ['metadata.namespace', { ...resource, metadata: { ...resource.metadata, namespace: false } }],
    [
      'metadata.annotations',
      { ...resource, metadata: { ...resource.metadata, annotations: null } },
    ],
    [
      'metadata.annotations.custom',
      { ...resource, metadata: { ...resource.metadata, annotations: { custom: 42 } } },
    ],
    ['metadata.labels', { ...resource, metadata: { ...resource.metadata, labels: [] } }],
    [
      'metadata.labels.custom',
      { ...resource, metadata: { ...resource.metadata, labels: { custom: false } } },
    ],
    ['spec', { ...resource, spec: undefined }],
    ['spec', { ...resource, spec: null }],
    ['spec', { ...resource, spec: 'not-a-spec' }],
    ['spec', { ...resource, spec: 42 }],
    ['spec', { ...resource, spec: [] }],
  ])('should report invalid %s and return no model', (path, model) => {
    const result = convertYamlToResources(stringify(model));
    expect(result.resources.model).toBeUndefined();
    expect(result.error?.message).toContain(`Invalid Kubernetes resource YAML: ${path}:`);
  });

  it.each(['invalid: yaml:', `${stringify(resource)}---\n${stringify(resource)}`])(
    'should return an error for malformed YAML or multiple documents: %s',
    (yaml) => {
      const result = convertYamlToResources(yaml);
      expect(result.resources.model).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
    },
  );
});

describe('isYamlDirty', () => {
  const atEntry = stringify({ ...resource, spec: { replicas: 1 } });

  it('should not be dirty when the editor yaml is unchanged', () => {
    expect(isYamlDirty(atEntry, atEntry)).toBe(false);
  });

  it('should not be dirty for comment, whitespace or key-order changes', () => {
    const reformatted = `# my notes\nspec:\n    replicas: 1   # one\nmetadata: { namespace: test-ns, name: test-resource }\nkind: ConfigMap\napiVersion: v1\n`;
    expect(isYamlDirty(reformatted, atEntry)).toBe(false);
  });

  it('should be dirty when a value changes', () => {
    expect(isYamlDirty(stringify({ ...resource, spec: { replicas: 2 } }), atEntry)).toBe(true);
  });

  it('should be dirty when a value changes type', () => {
    expect(isYamlDirty(stringify({ ...resource, spec: { replicas: '1' } }), atEntry)).toBe(true);
  });

  it('should be dirty without a snapshot', () => {
    expect(isYamlDirty(atEntry, undefined)).toBe(true);
  });

  it('should be dirty when the editor yaml cannot be parsed', () => {
    expect(isYamlDirty('spec: [unclosed', atEntry)).toBe(true);
  });

  it('should be dirty when the editor is cleared', () => {
    expect(isYamlDirty('', atEntry)).toBe(true);
  });
});

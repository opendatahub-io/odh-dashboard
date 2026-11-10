import { mockLLMInferenceServiceConfigK8sResource } from '../../__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { parseLlmInferenceServiceConfig } from '../parseLlmInferenceServiceConfig';

describe('parseLlmInferenceServiceConfig', () => {
  it('should decode the full config and preserve spec and relevant metadata', () => {
    const source = mockLLMInferenceServiceConfigK8sResource({ name: 'library-config' });
    expect(parseLlmInferenceServiceConfig(JSON.stringify(source))).toEqual(source);
  });

  it.each(['{broken', 'null', '[]', '{}', '{"metadata":null}', '{"metadata":[]}'])(
    'should reject malformed JSON or a non-config value: %s',
    (input) => {
      expect(() => parseLlmInferenceServiceConfig(input)).toThrow();
    },
  );

  it('should reject metadata without a string resource name', () => {
    expect(() => parseLlmInferenceServiceConfig('{"metadata":{"name":42}}')).toThrow(
      'metadata.name',
    );
  });

  it('should reject a non-object annotations value', () => {
    expect(() =>
      parseLlmInferenceServiceConfig('{"metadata":{"name":"config","annotations":[]}}'),
    ).toThrow('annotations must be an object');
  });

  it('should remove malformed annotation values before name and version prefill', () => {
    const source = mockLLMInferenceServiceConfigK8sResource({});
    const result = parseLlmInferenceServiceConfig(
      JSON.stringify({
        ...source,
        metadata: {
          ...source.metadata,
          annotations: {
            'openshift.io/display-name': 42,
            'opendatahub.io/runtime-version': [],
            'example.com/source': 'library',
          },
        },
      }),
    );
    expect(result.metadata.annotations).toEqual({ 'example.com/source': 'library' });
  });

  it('should reuse metadata cleanup without altering resource configuration', () => {
    const source = mockLLMInferenceServiceConfigK8sResource({ preInstalled: true });
    const metadata = {
      ...source.metadata,
      uid: 'source-uid',
      resourceVersion: '123',
      creationTimestamp: '2026-10-09T00:00:00Z',
      generation: 4,
      managedFields: [],
    };
    const result = parseLlmInferenceServiceConfig(JSON.stringify({ ...source, metadata }));
    for (const key of [
      'uid',
      'resourceVersion',
      'creationTimestamp',
      'generation',
      'managedFields',
      'ownerReferences',
    ]) {
      expect(result.metadata).not.toHaveProperty(key);
    }
    expect(result.metadata.name).toBe(source.metadata.name);
    expect(result.metadata.annotations).toEqual(source.metadata.annotations);
    expect(result.spec).toEqual(source.spec);
    expect(metadata.uid).toBe('source-uid');
  });
});

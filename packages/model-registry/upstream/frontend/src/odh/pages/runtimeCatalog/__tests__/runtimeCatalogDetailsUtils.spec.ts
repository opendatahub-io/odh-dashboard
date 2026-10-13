import {
  buildRuntimeImageInstallActionData,
  formatRuntimePublishedDate,
  formatRuntimeTemplate,
} from '~/odh/pages/runtimeCatalog/runtimeCatalogDetailsUtils';

describe('formatRuntimeTemplate', () => {
  it('should convert JSON with nested fields to YAML', () => {
    const template = '{"kind":"ServingRuntime","metadata":{"name":"example"}}';

    expect(formatRuntimeTemplate(template)).toBe(
      'kind: ServingRuntime\nmetadata:\n  name: example\n',
    );
  });

  it('should preserve a raw YAML template', () => {
    const template = 'kind: ServingRuntime\nmetadata:\n  name: raw-runtime\n';

    expect(formatRuntimeTemplate(template)).toBe(template);
  });

  it('should return N/A when the template is absent', () => {
    expect(formatRuntimeTemplate(undefined)).toBe('N/A');
    expect(formatRuntimeTemplate('')).toBe('N/A');
  });
});

describe('formatRuntimePublishedDate', () => {
  it('should format a UTC timestamp as a long date', () => {
    expect(formatRuntimePublishedDate('2026-10-01T00:00:00Z')).toBe('October 1, 2026');
  });

  it('should normalize an offset timestamp to the UTC date', () => {
    expect(formatRuntimePublishedDate('2026-09-30T23:30:00-02:00')).toBe('October 1, 2026');
  });

  it('should return undefined for an absent date', () => {
    expect(formatRuntimePublishedDate()).toBeUndefined();
    expect(formatRuntimePublishedDate('')).toBeUndefined();
  });

  it('should return undefined for an invalid date', () => {
    expect(formatRuntimePublishedDate('not-a-date')).toBeUndefined();
  });
});

describe('buildRuntimeImageInstallActionData', () => {
  const routes = {
    cancelReturnRoute: '/catalog/1',
    libraryReturnRoute: '/catalog',
  };

  it('should map the runtime, routes, and both templates', () => {
    expect(
      buildRuntimeImageInstallActionData({
        runtime: { id: '1', name: 'vllm', displayName: 'vLLM' },
        version: {
          artifactType: 'serving-runtime-version',
          version: '0.6.0',
          image: 'registry.example.com/mock/vllm:0.6.0',
          servingRuntimeTemplate: '{"kind":"ServingRuntime"}',
          llmInferenceServiceTemplate: '{"kind":"LLMInferenceServiceConfig"}',
        },
        ...routes,
      }),
    ).toEqual({
      runtimeImageId: '1',
      runtimeImageName: 'vLLM',
      cancelReturnRoute: '/catalog/1',
      libraryReturnRoute: '/catalog',
      deploymentResources: {
        servingRuntimeTemplate: '{"kind":"ServingRuntime"}',
        llmInferenceServiceConfig: '{"kind":"LLMInferenceServiceConfig"}',
      },
    });
  });

  it('should omit blank templates', () => {
    const payload = buildRuntimeImageInstallActionData({
      runtime: { id: '1', name: 'vllm' },
      version: {
        artifactType: 'serving-runtime-version',
        version: '0.6.0',
        image: 'registry.example.com/mock/vllm:0.6.0',
        servingRuntimeTemplate: '   ',
        llmInferenceServiceTemplate: '',
      },
      ...routes,
    });

    expect(payload.runtimeImageName).toBe('vllm');
    expect(payload.deploymentResources).toEqual({});
  });

  it('should keep only the template that has content', () => {
    const payload = buildRuntimeImageInstallActionData({
      runtime: { id: '1', name: 'vllm' },
      version: {
        artifactType: 'serving-runtime-version',
        version: '0.6.0',
        image: 'registry.example.com/mock/vllm:0.6.0',
        servingRuntimeTemplate: '',
        llmInferenceServiceTemplate: '{"kind":"LLMInferenceServiceConfig"}',
      },
      ...routes,
    });

    expect(payload.deploymentResources).toEqual({
      llmInferenceServiceConfig: '{"kind":"LLMInferenceServiceConfig"}',
    });
  });

  it('should fall back from a blank display name to the runtime name', () => {
    const payload = buildRuntimeImageInstallActionData({
      runtime: { id: '1', name: 'vllm', displayName: '  ' },
      ...routes,
    });

    expect(payload.runtimeImageName).toBe('vllm');
    expect(payload.deploymentResources).toEqual({});
  });

  it('should fall back from a blank name to the runtime id', () => {
    const payload = buildRuntimeImageInstallActionData({
      runtime: { id: '1', name: ' ', displayName: '' },
      ...routes,
    });

    expect(payload.runtimeImageId).toBe('1');
    expect(payload.runtimeImageName).toBe('1');
  });

  it('should use empty strings when the runtime has no id or name', () => {
    const payload = buildRuntimeImageInstallActionData({
      runtime: { displayName: ' ', name: '' },
      ...routes,
    });

    expect(payload.runtimeImageId).toBe('');
    expect(payload.runtimeImageName).toBe('');
  });
});

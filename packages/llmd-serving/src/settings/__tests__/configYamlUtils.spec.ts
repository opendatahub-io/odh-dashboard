import type { LLMInferenceServiceConfigKind } from '../../types';
import { overrideLlmConfigFields } from '../configYamlUtils';

const makeConfig = (
  overrides?: Partial<LLMInferenceServiceConfigKind['metadata']>,
): LLMInferenceServiceConfigKind => ({
  apiVersion: 'serving.kserve.io/v1alpha2',
  kind: 'LLMInferenceServiceConfig',
  metadata: {
    name: 'original-name',
    namespace: 'opendatahub',
    annotations: {
      'openshift.io/display-name': 'Original Display Name',
      'opendatahub.io/runtime-version': '0.15.0',
    },
    ...overrides,
  },
  spec: { model: { uri: 'hf://test/model' } },
});

describe('overrideLlmConfigFields', () => {
  it('should override metadata.name', () => {
    const result = overrideLlmConfigFields(makeConfig(), { name: 'new-name' });
    expect(result.metadata.name).toBe('new-name');
  });

  it('should not change name when name field is undefined', () => {
    const result = overrideLlmConfigFields(makeConfig(), { displayName: 'New' });
    expect(result.metadata.name).toBe('original-name');
  });

  it('should override display-name annotation', () => {
    const result = overrideLlmConfigFields(makeConfig(), { displayName: 'New Display Name' });
    expect(result.metadata.annotations?.['openshift.io/display-name']).toBe('New Display Name');
  });

  it('should set description annotation', () => {
    const result = overrideLlmConfigFields(makeConfig(), { description: 'A description' });
    expect(result.metadata.annotations?.['openshift.io/description']).toBe('A description');
  });

  it('should set version annotation', () => {
    const result = overrideLlmConfigFields(makeConfig(), { version: '1.0.0' });
    expect(result.metadata.annotations?.['opendatahub.io/runtime-version']).toBe('1.0.0');
  });

  it('should remove version annotation when version is empty string', () => {
    const result = overrideLlmConfigFields(makeConfig(), { version: '' });
    expect(result.metadata.annotations?.['opendatahub.io/runtime-version']).toBeUndefined();
  });

  it('should not modify version when version is undefined', () => {
    const result = overrideLlmConfigFields(makeConfig(), { name: 'new-name' });
    expect(result.metadata.annotations?.['opendatahub.io/runtime-version']).toBe('0.15.0');
  });

  it('should handle multiple overrides at once', () => {
    const result = overrideLlmConfigFields(makeConfig(), {
      name: 'new-name',
      displayName: 'New Name',
      description: 'New desc',
      version: '2.0.0',
    });
    expect(result.metadata.name).toBe('new-name');
    expect(result.metadata.annotations?.['openshift.io/display-name']).toBe('New Name');
    expect(result.metadata.annotations?.['openshift.io/description']).toBe('New desc');
    expect(result.metadata.annotations?.['opendatahub.io/runtime-version']).toBe('2.0.0');
  });

  it('should preserve other metadata and spec', () => {
    const result = overrideLlmConfigFields(makeConfig(), { name: 'new-name' });
    expect(result.apiVersion).toBe('serving.kserve.io/v1alpha2');
    expect(result.kind).toBe('LLMInferenceServiceConfig');
    expect(result.metadata.namespace).toBe('opendatahub');
    expect(result.spec?.model.uri).toBe('hf://test/model');
  });

  it('should handle config with no existing annotations', () => {
    const config = makeConfig({ annotations: undefined });
    const result = overrideLlmConfigFields(config, { displayName: 'Test' });
    expect(result.metadata.annotations?.['openshift.io/display-name']).toBe('Test');
  });
});

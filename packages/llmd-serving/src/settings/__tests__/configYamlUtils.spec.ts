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

const defaultOverrides = { namespace: 'opendatahub' };

describe('overrideLlmConfigFields', () => {
  it('should override metadata.name', () => {
    const result = overrideLlmConfigFields(makeConfig(), {
      ...defaultOverrides,
      name: 'new-name',
    });
    expect(result.metadata.name).toBe('new-name');
  });

  it('should not change name when name field is undefined', () => {
    const result = overrideLlmConfigFields(makeConfig(), {
      ...defaultOverrides,
      displayName: 'New',
    });
    expect(result.metadata.name).toBe('original-name');
  });

  it('should override namespace', () => {
    const result = overrideLlmConfigFields(makeConfig(), { namespace: 'other-ns' });
    expect(result.metadata.namespace).toBe('other-ns');
  });

  it('should override display-name annotation', () => {
    const result = overrideLlmConfigFields(makeConfig(), {
      ...defaultOverrides,
      displayName: 'New Display Name',
    });
    expect(result.metadata.annotations?.['openshift.io/display-name']).toBe('New Display Name');
  });

  it('should set description annotation', () => {
    const result = overrideLlmConfigFields(makeConfig(), {
      ...defaultOverrides,
      description: 'A description',
    });
    expect(result.metadata.annotations?.['openshift.io/description']).toBe('A description');
  });

  it('should set version annotation', () => {
    const result = overrideLlmConfigFields(makeConfig(), {
      ...defaultOverrides,
      version: '1.0.0',
    });
    expect(result.metadata.annotations?.['opendatahub.io/runtime-version']).toBe('1.0.0');
  });

  it('should remove version annotation when version is empty string', () => {
    const result = overrideLlmConfigFields(makeConfig(), { ...defaultOverrides, version: '' });
    expect(result.metadata.annotations?.['opendatahub.io/runtime-version']).toBeUndefined();
  });

  it('should not modify version when version is undefined', () => {
    const result = overrideLlmConfigFields(makeConfig(), {
      ...defaultOverrides,
      name: 'new-name',
    });
    expect(result.metadata.annotations?.['opendatahub.io/runtime-version']).toBe('0.15.0');
  });

  it('should set apiVersion and kind from the model', () => {
    const result = overrideLlmConfigFields(makeConfig(), defaultOverrides);
    expect(result.apiVersion).toBe('serving.kserve.io/v1alpha2');
    expect(result.kind).toBe('LLMInferenceServiceConfig');
  });

  it('should add dashboard label', () => {
    const result = overrideLlmConfigFields(makeConfig(), defaultOverrides);
    expect(result.metadata.labels?.['opendatahub.io/dashboard']).toBe('true');
  });

  it('should merge additional labels', () => {
    const result = overrideLlmConfigFields(makeConfig(), {
      ...defaultOverrides,
      labels: { 'opendatahub.io/config-type': 'topology' },
    });
    expect(result.metadata.labels?.['opendatahub.io/config-type']).toBe('topology');
    expect(result.metadata.labels?.['opendatahub.io/dashboard']).toBe('true');
  });

  it('should merge additional annotations', () => {
    const result = overrideLlmConfigFields(makeConfig(), {
      ...defaultOverrides,
      annotations: { 'custom/key': 'value' },
    });
    expect(result.metadata.annotations?.['custom/key']).toBe('value');
    expect(result.metadata.annotations?.['openshift.io/display-name']).toBe(
      'Original Display Name',
    );
  });

  it('should handle multiple overrides at once', () => {
    const result = overrideLlmConfigFields(makeConfig(), {
      name: 'new-name',
      namespace: 'test-ns',
      displayName: 'New Name',
      description: 'New desc',
      version: '2.0.0',
    });
    expect(result.metadata.name).toBe('new-name');
    expect(result.metadata.namespace).toBe('test-ns');
    expect(result.metadata.annotations?.['openshift.io/display-name']).toBe('New Name');
    expect(result.metadata.annotations?.['openshift.io/description']).toBe('New desc');
    expect(result.metadata.annotations?.['opendatahub.io/runtime-version']).toBe('2.0.0');
    expect(result.metadata.labels?.['opendatahub.io/dashboard']).toBe('true');
  });

  it('should preserve spec', () => {
    const result = overrideLlmConfigFields(makeConfig(), defaultOverrides);
    expect(result.spec?.model.uri).toBe('hf://test/model');
  });

  it('should handle config with no existing annotations', () => {
    const config = makeConfig({ annotations: undefined });
    const result = overrideLlmConfigFields(config, {
      ...defaultOverrides,
      displayName: 'Test',
    });
    expect(result.metadata.annotations?.['openshift.io/display-name']).toBe('Test');
  });

  it('should override namespace even when input config has a different namespace', () => {
    const config = makeConfig({ namespace: 'user-provided-namespace' });
    const result = overrideLlmConfigFields(config, { namespace: 'opendatahub' });
    expect(result.metadata.namespace).toBe('opendatahub');
  });

  it('should override apiVersion even when input config has a different apiVersion', () => {
    const config = {
      ...makeConfig(),
      apiVersion: 'v1',
    } as unknown as LLMInferenceServiceConfigKind;
    const result = overrideLlmConfigFields(config, defaultOverrides);
    expect(result.apiVersion).toBe('serving.kserve.io/v1alpha2');
  });

  it('should override kind even when input config has a different kind', () => {
    const config = {
      ...makeConfig(),
      kind: 'ConfigMap',
    } as unknown as LLMInferenceServiceConfigKind;
    const result = overrideLlmConfigFields(config, defaultOverrides);
    expect(result.kind).toBe('LLMInferenceServiceConfig');
  });

  it('should add dashboard label even when input config has no labels', () => {
    const config = makeConfig({ labels: undefined });
    const result = overrideLlmConfigFields(config, defaultOverrides);
    expect(result.metadata.labels?.['opendatahub.io/dashboard']).toBe('true');
  });

  it('should enforce dashboard label even if caller tries to override it', () => {
    const result = overrideLlmConfigFields(makeConfig(), {
      ...defaultOverrides,
      labels: { 'opendatahub.io/dashboard': 'false' },
    });
    expect(result.metadata.labels?.['opendatahub.io/dashboard']).toBe('true');
  });
});

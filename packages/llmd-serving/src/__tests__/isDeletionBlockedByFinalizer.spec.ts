import { isDeletionBlockedByFinalizer } from '../utils';

describe('isDeletionBlockedByFinalizer', () => {
  it('should return false for a K8sStatus success response', () => {
    const result = {
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Success',
      code: 200,
      message: '',
      reason: '',
    };
    expect(isDeletionBlockedByFinalizer(result)).toBe(false);
  });

  it('should return true when the resource has a deletionTimestamp', () => {
    const result = {
      kind: 'LLMInferenceServiceConfig',
      apiVersion: 'serving.kserve.io/v1alpha2',
      metadata: {
        name: 'test-config',
        namespace: 'opendatahub',
        deletionTimestamp: '2026-08-05T12:00:00Z',
        finalizers: ['serving.kserve.io/llmisvcconfig-finalizer'],
      },
      spec: {},
    };
    expect(isDeletionBlockedByFinalizer(result)).toBe(true);
  });

  it('should return false when the resource has no deletionTimestamp', () => {
    const result = {
      kind: 'LLMInferenceServiceConfig',
      apiVersion: 'serving.kserve.io/v1alpha2',
      metadata: {
        name: 'test-config',
        namespace: 'opendatahub',
      },
      spec: {},
    };
    expect(isDeletionBlockedByFinalizer(result)).toBe(false);
  });

  it('should return false for null input', () => {
    expect(isDeletionBlockedByFinalizer(null)).toBe(false);
  });

  it('should return false for undefined input', () => {
    expect(isDeletionBlockedByFinalizer(undefined)).toBe(false);
  });

  it('should return false for non-object input', () => {
    expect(isDeletionBlockedByFinalizer('string')).toBe(false);
    expect(isDeletionBlockedByFinalizer(42)).toBe(false);
  });

  it('should return false when metadata is missing', () => {
    const result = {
      kind: 'LLMInferenceServiceConfig',
      apiVersion: 'serving.kserve.io/v1alpha2',
    };
    expect(isDeletionBlockedByFinalizer(result)).toBe(false);
  });

  it('should return false when metadata is null', () => {
    const result = {
      kind: 'LLMInferenceServiceConfig',
      apiVersion: 'serving.kserve.io/v1alpha2',
      metadata: null,
    };
    expect(isDeletionBlockedByFinalizer(result)).toBe(false);
  });

  it('should return false when deletionTimestamp is set but finalizers are missing', () => {
    const result = {
      kind: 'LLMInferenceServiceConfig',
      apiVersion: 'serving.kserve.io/v1alpha2',
      metadata: {
        name: 'test-config',
        namespace: 'opendatahub',
        deletionTimestamp: '2026-08-05T12:00:00Z',
      },
      spec: {},
    };
    expect(isDeletionBlockedByFinalizer(result)).toBe(false);
  });

  it('should return false when deletionTimestamp is set but finalizer is unrelated', () => {
    const result = {
      kind: 'LLMInferenceServiceConfig',
      apiVersion: 'serving.kserve.io/v1alpha2',
      metadata: {
        name: 'test-config',
        namespace: 'opendatahub',
        deletionTimestamp: '2026-08-05T12:00:00Z',
        finalizers: ['example.com/other-finalizer'],
      },
      spec: {},
    };
    expect(isDeletionBlockedByFinalizer(result)).toBe(false);
  });

  it('should return false when deletionTimestamp is set but finalizers array is empty', () => {
    const result = {
      kind: 'LLMInferenceServiceConfig',
      apiVersion: 'serving.kserve.io/v1alpha2',
      metadata: {
        name: 'test-config',
        namespace: 'opendatahub',
        deletionTimestamp: '2026-08-05T12:00:00Z',
        finalizers: [],
      },
      spec: {},
    };
    expect(isDeletionBlockedByFinalizer(result)).toBe(false);
  });
});

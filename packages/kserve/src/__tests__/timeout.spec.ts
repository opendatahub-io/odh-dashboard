import type { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockInferenceServiceK8sResource';
import {
  applyTimeoutConfig,
  extractTimeoutConfig,
} from '../wizardFields/timeout/timeoutApplyExtract';

describe('applyTimeoutConfig', () => {
  let mockInferenceService: InferenceServiceKind;

  beforeEach(() => {
    mockInferenceService = mockInferenceServiceK8sResource({
      name: 'test-model',
      namespace: 'test-project',
    });
  });
  it('should return unchanged InferenceService when timeoutConfig is undefined', () => {
    const result = applyTimeoutConfig(mockInferenceService, undefined);
    expect(result).toEqual(mockInferenceService);
  });

  it('should set spec.predictor.timeout when timeout is provided', () => {
    const result = applyTimeoutConfig(mockInferenceService, {
      timeout: 60,
      return401: false,
    });

    expect(result.spec.predictor.timeout).toBe(60);
  });

  it('should set auth-proxy-type annotation when return401 is true', () => {
    const result = applyTimeoutConfig(mockInferenceService, {
      timeout: 30,
      return401: true,
    });

    expect(result.metadata.annotations?.['security.opendatahub.io/auth-proxy-type']).toBe(
      'kube-rbac-proxy',
    );
  });

  it('should not set auth-proxy-type annotation when return401 is false', () => {
    const result = applyTimeoutConfig(mockInferenceService, {
      timeout: 30,
      return401: false,
    });

    expect(
      result.metadata.annotations?.['security.opendatahub.io/auth-proxy-type'],
    ).toBeUndefined();
  });

  it('should clear existing timeout on update', () => {
    const existingService: InferenceServiceKind = {
      ...mockInferenceService,
      spec: {
        ...mockInferenceService.spec,
        predictor: {
          ...mockInferenceService.spec.predictor,
          timeout: 120,
        },
      },
    };

    const result = applyTimeoutConfig(existingService, {
      timeout: 45,
      return401: false,
    });

    expect(result.spec.predictor.timeout).toBe(45);
  });

  it('should clear existing auth-proxy-type annotation on update when return401 is false', () => {
    const existingService: InferenceServiceKind = {
      ...mockInferenceService,
      metadata: {
        ...mockInferenceService.metadata,
        annotations: {
          ...mockInferenceService.metadata.annotations,
          'security.opendatahub.io/auth-proxy-type': 'kube-rbac-proxy',
        },
      },
    };

    const result = applyTimeoutConfig(existingService, {
      timeout: 30,
      return401: false,
    });

    expect(
      result.metadata.annotations?.['security.opendatahub.io/auth-proxy-type'],
    ).toBeUndefined();
  });

  it('should handle InferenceService without existing annotations', () => {
    const serviceWithoutAnnotations: InferenceServiceKind = {
      ...mockInferenceService,
      metadata: {
        ...mockInferenceService.metadata,
        annotations: undefined,
      },
    };

    const result = applyTimeoutConfig(serviceWithoutAnnotations, {
      timeout: 30,
      return401: true,
    });

    expect(result.metadata.annotations).toBeDefined();
    expect(result.metadata.annotations?.['security.opendatahub.io/auth-proxy-type']).toBe(
      'kube-rbac-proxy',
    );
  });

  it('should not mutate the original InferenceService', () => {
    const originalTimeout = mockInferenceService.spec.predictor.timeout;

    applyTimeoutConfig(mockInferenceService, {
      timeout: 90,
      return401: true,
    });

    expect(mockInferenceService.spec.predictor.timeout).toBe(originalTimeout);
    expect(
      mockInferenceService.metadata.annotations?.['security.opendatahub.io/auth-proxy-type'],
    ).toBeUndefined();
  });
});

describe('extractTimeoutConfig', () => {
  it('should extract timeout from existing InferenceService', () => {
    const deployment = {
      model: {
        ...mockInferenceServiceK8sResource({ name: 'test-model' }),
        spec: {
          predictor: {
            timeout: 60,
            model: {
              modelFormat: { name: 'onnx' },
              runtime: 'test-runtime',
            },
          },
        },
      } as InferenceServiceKind,
    };

    const result = extractTimeoutConfig(deployment);

    expect(result.timeout).toBe(60);
  });

  it('should return default timeout (30) when not set', () => {
    const deployment = {
      model: mockInferenceServiceK8sResource({ name: 'test-model' }),
    };

    const result = extractTimeoutConfig(deployment);

    expect(result.timeout).toBe(30);
  });

  it('should return return401: true when auth-proxy-type annotation is kube-rbac-proxy', () => {
    const mockService = mockInferenceServiceK8sResource({ name: 'test-model' });
    const deployment = {
      model: {
        ...mockService,
        metadata: {
          ...mockService.metadata,
          annotations: {
            ...mockService.metadata.annotations,
            'security.opendatahub.io/auth-proxy-type': 'kube-rbac-proxy',
          },
        },
      } as InferenceServiceKind,
    };

    const result = extractTimeoutConfig(deployment);

    expect(result.return401).toBe(true);
  });

  it('should return return401: false when auth-proxy-type annotation is not set', () => {
    const deployment = {
      model: mockInferenceServiceK8sResource({ name: 'test-model' }),
    };

    const result = extractTimeoutConfig(deployment);

    expect(result.return401).toBe(false);
  });

  it('should return return401: false when auth-proxy-type annotation has different value', () => {
    const mockService = mockInferenceServiceK8sResource({ name: 'test-model' });
    const deployment = {
      model: {
        ...mockService,
        metadata: {
          ...mockService.metadata,
          annotations: {
            ...mockService.metadata.annotations,
            'security.opendatahub.io/auth-proxy-type': 'other-value',
          },
        },
      } as InferenceServiceKind,
    };

    const result = extractTimeoutConfig(deployment);

    expect(result.return401).toBe(false);
  });

  it('should extract both timeout and return401 correctly', () => {
    const mockService = mockInferenceServiceK8sResource({ name: 'test-model' });
    const deployment = {
      model: {
        ...mockService,
        spec: {
          predictor: {
            timeout: 90,
            model: {
              modelFormat: { name: 'onnx' },
              runtime: 'test-runtime',
            },
          },
        },
        metadata: {
          ...mockService.metadata,
          annotations: {
            ...mockService.metadata.annotations,
            'security.opendatahub.io/auth-proxy-type': 'kube-rbac-proxy',
          },
        },
      } as InferenceServiceKind,
    };

    const result = extractTimeoutConfig(deployment);

    expect(result.timeout).toBe(90);
    expect(result.return401).toBe(true);
  });
});

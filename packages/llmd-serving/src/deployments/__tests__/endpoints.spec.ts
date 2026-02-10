import type { LLMInferenceServiceKind } from '../../types';
import { getLLMdDeploymentEndpoints } from '../endpoints';

// Helper to create a minimal LLMInferenceServiceKind for testing
const makeLLMInferenceService = (
  status?: LLMInferenceServiceKind['status'],
): LLMInferenceServiceKind =>
  ({
    apiVersion: 'serving.kserve.io/v1alpha1',
    kind: 'LLMInferenceService',
    metadata: { name: 'test-llmisvc', namespace: 'test-ns' },
    spec: { model: { uri: 'hf://test/model' } },
    status,
  } as LLMInferenceServiceKind);

describe('getLLMdDeploymentEndpoints', () => {
  it('should return empty array when status is undefined', () => {
    const llmSvc = makeLLMInferenceService(undefined);
    const endpoints = getLLMdDeploymentEndpoints(llmSvc);
    expect(endpoints).toHaveLength(0);
  });

  it('should return external endpoint from status.url', () => {
    const llmSvc = makeLLMInferenceService({
      url: 'https://my-model.apps.example.com/v1',
    });
    const endpoints = getLLMdDeploymentEndpoints(llmSvc);
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0]).toEqual({
      type: 'external',
      url: 'https://my-model.apps.example.com/v1',
    });
  });

  it('should return internal endpoint from status.addresses when status.url is not set', () => {
    const llmSvc = makeLLMInferenceService({
      addresses: [
        {
          url: 'https://openshift-ai-inference.openshift-ingress.svc.cluster.local/ns/my-model',
        },
      ],
    });
    const endpoints = getLLMdDeploymentEndpoints(llmSvc);
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0]).toEqual({
      type: 'internal',
      url: 'https://openshift-ai-inference.openshift-ingress.svc.cluster.local/ns/my-model',
    });
  });

  it('should return external endpoint from status.addresses when URL does not contain svc.cluster.local', () => {
    const llmSvc = makeLLMInferenceService({
      addresses: [{ url: 'https://my-model.apps.example.com/v1' }],
    });
    const endpoints = getLLMdDeploymentEndpoints(llmSvc);
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0]).toEqual({
      type: 'external',
      url: 'https://my-model.apps.example.com/v1',
    });
  });

  it('should return both internal and external from status.addresses', () => {
    const llmSvc = makeLLMInferenceService({
      addresses: [
        { url: 'https://my-model.namespace.svc.cluster.local:8080/v1' },
        { url: 'https://my-model.apps.example.com/v1' },
      ],
    });
    const endpoints = getLLMdDeploymentEndpoints(llmSvc);
    expect(endpoints).toHaveLength(2);
    expect(endpoints[0]).toEqual({
      type: 'internal',
      url: 'https://my-model.namespace.svc.cluster.local:8080/v1',
    });
    expect(endpoints[1]).toEqual({
      type: 'external',
      url: 'https://my-model.apps.example.com/v1',
    });
  });

  it('should not use addresses fallback when status.url is already set', () => {
    const llmSvc = makeLLMInferenceService({
      url: 'https://my-model.apps.example.com/v1',
      addresses: [
        { url: 'https://my-model.namespace.svc.cluster.local:8080/v1' },
        { url: 'https://my-model.apps.example.com/v1' },
      ],
    });
    const endpoints = getLLMdDeploymentEndpoints(llmSvc);
    // Only status.url endpoint, fallback should not activate
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0]).toEqual({
      type: 'external',
      url: 'https://my-model.apps.example.com/v1',
    });
  });

  it('should skip addresses with no url', () => {
    const llmSvc = makeLLMInferenceService({
      addresses: [{ name: 'no-url-entry' }, { url: 'https://my-model.apps.example.com/v1' }],
    });
    const endpoints = getLLMdDeploymentEndpoints(llmSvc);
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0]).toEqual({
      type: 'external',
      url: 'https://my-model.apps.example.com/v1',
    });
  });

  it('should return empty array when status has empty addresses and no url', () => {
    const llmSvc = makeLLMInferenceService({
      addresses: [],
    });
    const endpoints = getLLMdDeploymentEndpoints(llmSvc);
    expect(endpoints).toHaveLength(0);
  });
});

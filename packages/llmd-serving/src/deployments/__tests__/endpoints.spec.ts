import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceK8sResource';
import { getLLMdDeploymentEndpoints } from '../endpoints';

describe('getLLMdDeploymentEndpoints', () => {
  it('should return external endpoint from status.url', () => {
    const llmSvc = mockLLMInferenceServiceK8sResource({
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
    const llmSvc = mockLLMInferenceServiceK8sResource({});
    llmSvc.status = {
      addresses: [
        {
          url: 'https://openshift-ai-inference.openshift-ingress.svc.cluster.local/ns/my-model',
        },
      ],
    };
    const endpoints = getLLMdDeploymentEndpoints(llmSvc);
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0]).toEqual({
      type: 'internal',
      url: 'https://openshift-ai-inference.openshift-ingress.svc.cluster.local/ns/my-model',
    });
  });

  it('should return external endpoint from status.addresses when URL does not contain svc.cluster.local', () => {
    const llmSvc = mockLLMInferenceServiceK8sResource({});
    llmSvc.status = {
      addresses: [{ url: 'https://my-model.apps.example.com/v1' }],
    };
    const endpoints = getLLMdDeploymentEndpoints(llmSvc);
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0]).toEqual({
      type: 'external',
      url: 'https://my-model.apps.example.com/v1',
    });
  });

  it('should return both internal and external from status.addresses', () => {
    const llmSvc = mockLLMInferenceServiceK8sResource({});
    llmSvc.status = {
      addresses: [
        { url: 'https://my-model.namespace.svc.cluster.local:8080/v1' },
        { url: 'https://my-model.apps.example.com/v1' },
      ],
    };
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
    const llmSvc = mockLLMInferenceServiceK8sResource({
      url: 'https://my-model.apps.example.com/v1',
      addresses: [
        { url: 'https://my-model.namespace.svc.cluster.local:8080/v1' },
        { url: 'https://my-model.apps.example.com/v1' },
      ],
    });
    const endpoints = getLLMdDeploymentEndpoints(llmSvc);
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0]).toEqual({
      type: 'external',
      url: 'https://my-model.apps.example.com/v1',
    });
  });

  it('should skip addresses with no url', () => {
    const llmSvc = mockLLMInferenceServiceK8sResource({});
    llmSvc.status = {
      addresses: [{ name: 'no-url-entry' }, { url: 'https://my-model.apps.example.com/v1' }],
    };
    const endpoints = getLLMdDeploymentEndpoints(llmSvc);
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0]).toEqual({
      type: 'external',
      url: 'https://my-model.apps.example.com/v1',
    });
  });

  it('should return empty array when status has empty addresses and no url', () => {
    const llmSvc = mockLLMInferenceServiceK8sResource({});
    llmSvc.status = { addresses: [] };
    const endpoints = getLLMdDeploymentEndpoints(llmSvc);
    expect(endpoints).toHaveLength(0);
  });

  it('should return empty array when status is undefined', () => {
    const llmSvc = mockLLMInferenceServiceK8sResource({});
    llmSvc.status = undefined;
    const endpoints = getLLMdDeploymentEndpoints(llmSvc);
    expect(endpoints).toHaveLength(0);
  });
});

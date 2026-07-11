import { k8sDeleteResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import {
  LLMInferenceServiceModel,
  LLMInferenceServiceConfigModel,
  type LLMdDeployment,
} from '../../types';
import { deleteDeployment } from '../LLMdDeployment';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sDeleteResource: jest.fn(),
}));

const k8sDeleteResourceMock = jest.mocked(k8sDeleteResource);

const mockDeployment = (opts: {
  name: string;
  namespace: string;
  hasMatchingConfig: boolean;
}): LLMdDeployment =>
  ({
    modelServingPlatformId: 'llmd',
    model: {
      kind: 'LLMInferenceService',
      apiVersion: 'serving.kserve.io/v1alpha2',
      metadata: {
        name: opts.name,
        namespace: opts.namespace,
      },
      spec: {
        model: { uri: 'pvc://model' },
        baseRefs: opts.hasMatchingConfig ? [{ name: opts.name }] : [],
      },
    },
  }) as unknown as LLMdDeployment;

describe('deleteDeployment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete only the service when no matching config exists', async () => {
    k8sDeleteResourceMock.mockResolvedValue({} as K8sStatus);

    const deployment = mockDeployment({
      name: 'my-model',
      namespace: 'test-ns',
      hasMatchingConfig: false,
    });

    await deleteDeployment(deployment);

    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: LLMInferenceServiceModel,
      queryOptions: { name: 'my-model', ns: 'test-ns' },
    });
  });

  it('should delete both service and config when matching config exists', async () => {
    k8sDeleteResourceMock.mockResolvedValue({} as K8sStatus);

    const deployment = mockDeployment({
      name: 'my-model',
      namespace: 'test-ns',
      hasMatchingConfig: true,
    });

    await deleteDeployment(deployment);

    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(2);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: LLMInferenceServiceModel,
      queryOptions: { name: 'my-model', ns: 'test-ns' },
    });
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: LLMInferenceServiceConfigModel,
      queryOptions: { name: 'my-model', ns: 'test-ns' },
    });
  });

  it('should suppress 404 error when config is already deleted', async () => {
    k8sDeleteResourceMock.mockImplementation((opts: { model: { kind: string } }) => {
      if (opts.model.kind === 'LLMInferenceServiceConfig') {
        return Promise.reject({ statusObject: { code: 404 } });
      }
      return Promise.resolve({} as K8sStatus);
    });

    const deployment = mockDeployment({
      name: 'my-model',
      namespace: 'test-ns',
      hasMatchingConfig: true,
    });

    await expect(deleteDeployment(deployment)).resolves.toBeUndefined();
  });

  it('should suppress 404 from K8sStatusError-shaped rejection', async () => {
    k8sDeleteResourceMock.mockImplementation((opts: { model: { kind: string } }) => {
      if (opts.model.kind === 'LLMInferenceServiceConfig') {
        const error = Object.assign(new Error('Not Found'), {
          statusObject: { code: 404, message: 'Not Found' },
        });
        return Promise.reject(error);
      }
      return Promise.resolve({} as K8sStatus);
    });

    const deployment = mockDeployment({
      name: 'my-model',
      namespace: 'test-ns',
      hasMatchingConfig: true,
    });

    await expect(deleteDeployment(deployment)).resolves.toBeUndefined();
  });

  it('should propagate non-404 errors from config delete', async () => {
    k8sDeleteResourceMock.mockImplementation((opts: { model: { kind: string } }) => {
      if (opts.model.kind === 'LLMInferenceServiceConfig') {
        return Promise.reject({ statusObject: { code: 403 } });
      }
      return Promise.resolve({} as K8sStatus);
    });

    const deployment = mockDeployment({
      name: 'my-model',
      namespace: 'test-ns',
      hasMatchingConfig: true,
    });

    await expect(deleteDeployment(deployment)).rejects.toEqual({ statusObject: { code: 403 } });
  });

  it('should propagate errors from service delete', async () => {
    k8sDeleteResourceMock.mockRejectedValue(new Error('service delete failed'));

    const deployment = mockDeployment({
      name: 'my-model',
      namespace: 'test-ns',
      hasMatchingConfig: false,
    });

    await expect(deleteDeployment(deployment)).rejects.toThrow('service delete failed');
  });
});

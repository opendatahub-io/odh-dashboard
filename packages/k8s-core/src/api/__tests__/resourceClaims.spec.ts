import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mock403Error, mock404Error } from '../../__mocks__/mockK8sStatus';
import { mockResourceClaim } from '../../__mocks__/mockResourceClaim';
import { mockResourceClaimTemplate } from '../../__mocks__/mockResourceClaimTemplate';
import type { ResourceClaimKind, ResourceClaimTemplateKind } from '../../dra/types';
import { K8sStatusError } from '../../errorUtils';
import { ResourceClaimModel, ResourceClaimTemplateModel } from '../models';
import { getResourceClaim, getResourceClaimTemplate } from '../resourceClaims';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sGetResource: jest.fn(),
}));

const k8sGetResourceMock = jest.mocked(
  k8sGetResource<ResourceClaimKind | ResourceClaimTemplateKind>,
);

describe('getResourceClaimTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get a ResourceClaimTemplate by namespace and name', async () => {
    const template = mockResourceClaimTemplate({ name: 'gpu-template', namespace: 'my-project' });
    k8sGetResourceMock.mockResolvedValue(template);

    const result = await getResourceClaimTemplate('my-project', 'gpu-template');

    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: ResourceClaimTemplateModel,
      queryOptions: { name: 'gpu-template', ns: 'my-project', queryParams: {} },
      fetchOptions: { requestInit: {} },
    });
    expect(result).toBe(template);
  });

  it('should pass the abort signal through to the request', async () => {
    const controller = new AbortController();
    k8sGetResourceMock.mockResolvedValue(mockResourceClaimTemplate({}));

    await getResourceClaimTemplate('my-project', 'gpu-template', { signal: controller.signal });

    expect(k8sGetResourceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchOptions: { requestInit: { signal: controller.signal } },
      }),
    );
  });

  it('should propagate a 404 error', async () => {
    k8sGetResourceMock.mockRejectedValue(new K8sStatusError(mock404Error({})));

    const request = getResourceClaimTemplate('my-project', 'missing');
    await expect(request).rejects.toBeInstanceOf(K8sStatusError);
    await expect(request).rejects.toMatchObject({ statusObject: { code: 404 } });
  });

  it('should propagate a 403 error', async () => {
    k8sGetResourceMock.mockRejectedValue(new K8sStatusError(mock403Error({})));

    const request = getResourceClaimTemplate('my-project', 'restricted');
    await expect(request).rejects.toBeInstanceOf(K8sStatusError);
    await expect(request).rejects.toMatchObject({ statusObject: { code: 403 } });
  });
});

describe('getResourceClaim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get a ResourceClaim by namespace and name', async () => {
    const claim = mockResourceClaim({ name: 'my-pod-gpu-x7k2p', namespace: 'my-project' });
    k8sGetResourceMock.mockResolvedValue(claim);

    const result = await getResourceClaim('my-project', 'my-pod-gpu-x7k2p');

    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: ResourceClaimModel,
      queryOptions: { name: 'my-pod-gpu-x7k2p', ns: 'my-project', queryParams: {} },
      fetchOptions: { requestInit: {} },
    });
    expect(result).toBe(claim);
  });

  it('should propagate a 404 error', async () => {
    k8sGetResourceMock.mockRejectedValue(new K8sStatusError(mock404Error({})));

    const request = getResourceClaim('my-project', 'missing');
    await expect(request).rejects.toBeInstanceOf(K8sStatusError);
    await expect(request).rejects.toMatchObject({ statusObject: { code: 404 } });
  });

  it('should propagate a 403 error', async () => {
    k8sGetResourceMock.mockRejectedValue(new K8sStatusError(mock403Error({})));

    const request = getResourceClaim('my-project', 'restricted');
    await expect(request).rejects.toBeInstanceOf(K8sStatusError);
    await expect(request).rejects.toMatchObject({ statusObject: { code: 403 } });
  });
});

import { commonFetch } from '@openshift/dynamic-plugin-sdk-utils';
import { discoverK8sResource, DiscoveryForbiddenError } from '../discovery';
import { K8sStatusError } from '../../errorUtils';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({ commonFetch: jest.fn() }));
const fetch = jest.mocked(commonFetch);
const resource = { group: 'example.io', version: 'v1', resource: 'widgets' };

describe('Kubernetes discovery', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should discover the exact resource and preserve cancellation', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ resources: [{ name: 'widgets' }] }),
    } as Response);
    const { signal } = new AbortController();
    await expect(discoverK8sResource(resource, { signal })).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith('/apis/example.io/v1', { signal }, undefined, true);
  });

  it('should distinguish a missing version from an unavailable discovery endpoint', async () => {
    fetch.mockResolvedValue({ status: 404 } as Response);
    await expect(discoverK8sResource(resource)).resolves.toBe(false);
    fetch.mockResolvedValue({ status: 403 } as Response);
    await expect(discoverK8sResource(resource)).rejects.toBeInstanceOf(DiscoveryForbiddenError);
    fetch.mockResolvedValue({ status: 503 } as Response);
    await expect(discoverK8sResource(resource)).rejects.toThrow('503');
  });

  it('should not mistake a subresource for the required resource', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ resources: [{ name: 'widgets/status' }] }),
    } as Response);
    await expect(discoverK8sResource(resource)).resolves.toBe(false);
  });

  it('should classify Kubernetes Status errors from the RHOAI transport', async () => {
    const status = {
      apiVersion: 'v1',
      kind: 'Status',
      status: 'Failure' as const,
      message: 'Discovery failed',
      reason: 'NotFound',
    };
    fetch.mockRejectedValue(new K8sStatusError({ ...status, code: 404 }));
    await expect(discoverK8sResource(resource)).resolves.toBe(false);
    fetch.mockRejectedValue(new K8sStatusError({ ...status, code: 403, reason: 'Forbidden' }));
    await expect(discoverK8sResource(resource)).rejects.toBeInstanceOf(DiscoveryForbiddenError);
    const error = new K8sStatusError({ ...status, code: 500, reason: 'InternalError' });
    fetch.mockRejectedValue(error);
    await expect(discoverK8sResource(resource)).rejects.toBe(error);
  });

  it.each([null, {}, { resources: [null] }, { resources: [{ name: 12 }] }])(
    'should reject malformed discovery %p',
    async (body) => {
      fetch.mockResolvedValue({ ok: true, json: async () => body } as Response);
      await expect(discoverK8sResource(resource)).rejects.toThrow('Invalid API discovery');
    },
  );
});

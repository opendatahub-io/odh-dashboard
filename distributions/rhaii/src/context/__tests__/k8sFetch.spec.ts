import { K8sStatusError } from '@openshift/dynamic-plugin-sdk-utils';
import { mock403Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { k8sFetch } from '../k8sFetch';

const originalFetch = globalThis.fetch;
const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('RHAII Kubernetes transport', () => {
  it('should preserve successful responses and caller request options', async () => {
    const response = { ok: true, status: 201 } as Response;
    fetchMock.mockResolvedValue(response);
    const { signal } = new AbortController();
    const options = { method: 'POST', body: '{}', signal };

    await expect(
      k8sFetch('/apis/authorization.k8s.io/v1/selfsubjectaccessreviews', options),
    ).resolves.toBe(response);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/k8s/apis/authorization.k8s.io/v1/selfsubjectaccessreviews',
      options,
    );
  });

  it('should preserve Kubernetes validation and authorization error details', async () => {
    const body = mock403Error({ message: 'You cannot delete models in this namespace.' });
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => body } as Response);

    const request = k8sFetch(
      '/apis/serving.kserve.io/v1alpha1/namespaces/project/llminferenceservices/model',
    );
    await expect(request).rejects.toBeInstanceOf(K8sStatusError);
    await expect(request).rejects.toThrow(body.message);
  });

  it('should reject non-JSON HTTP failures with a status message', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async (): Promise<unknown> => {
        throw new SyntaxError('Not JSON');
      },
    } as Response);

    await expect(k8sFetch('/api/v1/namespaces')).rejects.toThrow('HTTP 502');
  });

  it('should propagate a cancelled request', async () => {
    const error = new DOMException('Aborted', 'AbortError');
    fetchMock.mockRejectedValue(error);
    await expect(k8sFetch('/api/v1/namespaces')).rejects.toBe(error);
  });

  it.each(['POST', 'PATCH', 'DELETE'])(
    'should reject a missing resource on %s instead of treating a failed mutation as an empty list',
    async (method) => {
      fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response);
      await expect(
        k8sFetch('/apis/infrastructure.opendatahub.io/v1/namespaces/dashboard/hardwareprofiles', {
          method,
        }),
      ).rejects.toThrow('HTTP 404');
    },
  );

  it.each([
    '/apis/template.openshift.io/v1/namespaces/dashboard/templates',
    '/apis/infrastructure.opendatahub.io/v1/namespaces/dashboard/hardwareprofiles',
  ])('should retain the existing optional missing-resource fallback for %s', async (url) => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 } as Response);
    const originalResponse = Object.getOwnPropertyDescriptor(globalThis, 'Response');
    const responseConstructor = jest.fn((body: string) => ({ json: async () => JSON.parse(body) }));
    Object.defineProperty(globalThis, 'Response', {
      configurable: true,
      value: responseConstructor,
    });
    try {
      const response = await k8sFetch(url);
      await expect(response.json()).resolves.toEqual({ apiVersion: 'v1', kind: 'List', items: [] });
      expect(responseConstructor).toHaveBeenCalledWith(expect.any(String), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } finally {
      if (originalResponse) {
        Object.defineProperty(globalThis, 'Response', originalResponse);
      } else {
        Reflect.deleteProperty(globalThis, 'Response');
      }
    }
  });
});

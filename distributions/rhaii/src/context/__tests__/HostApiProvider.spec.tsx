import * as React from 'react';
import { renderHook, act } from '@testing-library/react';
import { k8sCreateResource, commonFetch } from '@openshift/dynamic-plugin-sdk-utils';
import {
  HostApiCoreContext,
  useDashboardNamespace,
  useAccessReviewState,
} from '@odh-dashboard/plugin-core/host-api';
import HostApiProvider from '../HostApiProvider';
import { DashboardNamespaceProvider } from '../DashboardNamespaceContext';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sCreateResource: jest.fn(),
  commonFetch: jest.fn(),
}));
jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/host-api'),
  PluginCapabilities: ({ children }: React.PropsWithChildren) => children,
}));

const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
  <DashboardNamespaceProvider>
    <HostApiProvider>{children}</HostApiProvider>
  </DashboardNamespaceProvider>
);

describe('RHAII host adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ kube: { namespace: 'operator-ns' } }) });
  });
  afterEach(() => {
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  });

  it('should resolve the operator namespace from authenticated Core BFF status', async () => {
    const { result } = renderHook(useDashboardNamespace, { wrapper: Wrapper });
    await act(() => Promise.resolve());
    expect(result.current.dashboardNamespace).toBe('operator-ns');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/status',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it.each([true, false])('should use caller-scoped SSARs (allowed: %s)', async (allowed) => {
    jest.mocked(k8sCreateResource).mockResolvedValue({ status: { allowed } });
    const { result } = renderHook(
      () =>
        useAccessReviewState({
          group: 'serving.kserve.io',
          resource: 'llminferenceserviceconfigs',
          verb: 'delete',
          namespace: 'operator-ns',
          name: 'config-a',
        }),
      { wrapper: Wrapper },
    );
    await act(() => Promise.resolve());
    expect(result.current.state).toBe(allowed ? 'allowed' : 'denied');
    expect(k8sCreateResource).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: expect.objectContaining({
          spec: {
            resourceAttributes: {
              group: 'serving.kserve.io',
              resource: 'llminferenceserviceconfigs',
              verb: 'delete',
              namespace: 'operator-ns',
              name: 'config-a',
              subresource: '',
            },
          },
        }),
      }),
    );
  });

  it('should not grant access from a fallback namespace when status or SSAR fails', async () => {
    jest.mocked(globalThis.fetch).mockRejectedValue(new Error('status unavailable'));
    jest.mocked(k8sCreateResource).mockRejectedValue(new Error('SSAR unavailable'));
    const { result } = renderHook(
      () => ({
        namespace: useDashboardNamespace(),
        access: useAccessReviewState({
          resource: 'secrets',
          verb: 'create',
          namespace: 'opendatahub',
        }),
      }),
      { wrapper: Wrapper },
    );
    await act(() => Promise.resolve());
    expect(result.current.namespace.dashboardNamespace).toBe('opendatahub');
    expect(result.current.access.state).toBe('error');
  });

  it('should discover capabilities through the authenticated Kubernetes SDK transport', async () => {
    jest.mocked(commonFetch).mockResolvedValue({
      ok: true,
      json: async () => ({ resources: [{ name: 'llminferenceservices' }] }),
    } as Response);
    const { result } = renderHook(() => React.useContext(HostApiCoreContext), { wrapper: Wrapper });
    await act(async () => {
      await expect(
        result.current.discoverResource?.({
          group: 'serving.kserve.io',
          version: 'v1alpha2',
          resource: 'llminferenceservices',
        }),
      ).resolves.toBe(true);
    });
    expect(commonFetch).toHaveBeenCalledWith(
      '/apis/serving.kserve.io/v1alpha2',
      { signal: undefined },
      undefined,
      true,
    );
  });
});

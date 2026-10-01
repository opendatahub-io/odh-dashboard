import * as React from 'react';
import { act, renderHook } from '@testing-library/react';
import { k8sCreateResource, commonFetch } from '@openshift/dynamic-plugin-sdk-utils';
import {
  HostApiCoreContext,
  useDashboardNamespace,
  useAccessReviewState,
} from '@odh-dashboard/plugin-core/host-api';
import {
  GatewayDiscoveryContext,
  gatewayDiscoveryServices,
} from '@odh-dashboard/model-serving/api/gatewayDiscovery';
import HostApiProvider from '../HostApiProvider';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  k8sCreateResource: jest.fn(),
  commonFetch: jest.fn(),
}));
jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/host-api'),
  PluginCapabilities: () => null,
}));
jest.mock('#~/redux/selectors/project', () => ({
  useDashboardNamespace: () => ({ dashboardNamespace: 'rhoai-operator' }),
}));
jest.mock('#~/redux/selectors', () => ({ useUser: () => ({ username: 'caller' }) }));

describe('RHOAI host adapter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should adapt the existing namespace and model-serving gateway service', () => {
    const { result } = renderHook(
      () => ({
        namespace: useDashboardNamespace().dashboardNamespace,
        gateways: React.useContext(GatewayDiscoveryContext),
      }),
      { wrapper: HostApiProvider },
    );
    expect(result.current.namespace).toBe('rhoai-operator');
    expect(result.current.gateways).toBe(gatewayDiscoveryServices);
  });

  it.each([true, false])('should expose strict SSAR checks (allowed: %s)', async (allowed) => {
    jest.mocked(k8sCreateResource).mockResolvedValue({ status: { allowed } });
    const { result } = renderHook(
      () =>
        useAccessReviewState({
          group: 'serving.kserve.io',
          resource: 'llminferenceserviceconfigs',
          verb: 'patch',
          namespace: 'rhoai-operator',
          name: 'config-a',
        }),
      { wrapper: HostApiProvider },
    );
    await act(() => Promise.resolve());
    expect(result.current.state).toBe(allowed ? 'allowed' : 'denied');
  });

  it('should fail closed in the new contract while preserving legacy failure behavior', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation();
    jest.mocked(k8sCreateResource).mockRejectedValue(new Error('SSAR unavailable'));
    const { result } = renderHook(() => React.useContext(HostApiCoreContext), {
      wrapper: HostApiProvider,
    });
    const attrs = {
      verb: 'list' as const,
      group: '',
      resource: 'secrets',
      subresource: '' as const,
      namespace: 'project-a',
      name: '',
    };
    await expect(result.current.reviewAccess?.(attrs)).rejects.toThrow('SSAR unavailable');
    await expect(result.current.checkAccess(attrs)).resolves.toBe(true);
    warning.mockRestore();
  });

  it('should discover the LLM API through the caller transport', async () => {
    jest.mocked(commonFetch).mockResolvedValue({
      ok: true,
      json: async () => ({ resources: [{ name: 'llminferenceservices' }] }),
    } as Response);
    const { result } = renderHook(() => React.useContext(HostApiCoreContext), {
      wrapper: HostApiProvider,
    });
    await expect(
      result.current.discoverResource?.({
        group: 'serving.kserve.io',
        version: 'v1alpha2',
        resource: 'llminferenceservices',
      }),
    ).resolves.toBe(true);
    expect(commonFetch).toHaveBeenCalledWith(
      '/apis/serving.kserve.io/v1alpha2',
      { signal: undefined },
      undefined,
      true,
    );
  });
});

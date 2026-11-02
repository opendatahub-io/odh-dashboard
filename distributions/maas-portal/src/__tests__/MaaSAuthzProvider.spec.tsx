import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { usePluginStore } from '@openshift/dynamic-plugin-sdk';
import { getMaaSWhoAmI } from '@odh-dashboard/maas/api/whoami';
import MaaSAuthzProvider from '../providers/MaaSAuthzProvider';

jest.mock('@openshift/dynamic-plugin-sdk', () => ({
  usePluginStore: jest.fn(),
}));
jest.mock('@odh-dashboard/maas/api/whoami', () => ({ getMaaSWhoAmI: jest.fn() }));

const mockUsePluginStore = jest.mocked(usePluginStore);
const mockGetMaaSWhoAmI = jest.mocked(getMaaSWhoAmI);
const setFeatureFlags = jest.fn();

describe('MaaSAuthzProvider', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    window.__MAAS_CONSUMER_PORTAL_GRID__ = undefined;
    jest.clearAllMocks();
    mockGetMaaSWhoAmI.mockReturnValue(jest.fn().mockResolvedValue({ isAdmin: false }));
    mockUsePluginStore.mockReturnValue({ setFeatureFlags } as unknown as ReturnType<
      typeof usePluginStore
    >);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    window.__MAAS_CONSUMER_PORTAL_GRID__ = undefined;
  });

  const renderProvider = (): void => {
    render(
      <MaaSAuthzProvider>
        <div />
      </MaaSAuthzProvider>,
    );
  };

  it('does not check Kubernetes authorization in grid mode', () => {
    window.__MAAS_CONSUMER_PORTAL_GRID__ = true;
    global.fetch = jest.fn();

    renderProvider();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(setFeatureFlags).toHaveBeenCalledWith({
      ADMIN_USER: false,
      MAAS_MODEL_ACCESS_ADMIN: false,
    });
  });

  it('should enable ADMIN_USER only when the MaaS authorization endpoint allows access', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { allowed: true } }),
    } as Response);

    renderProvider();

    expect(global.fetch).toHaveBeenCalledWith('/maas/api/v1/is-maas-admin');
    expect(setFeatureFlags).toHaveBeenCalledWith({
      ADMIN_USER: false,
      MAAS_MODEL_ACCESS_ADMIN: false,
    });
    await waitFor(() => expect(setFeatureFlags).toHaveBeenCalledWith({ ADMIN_USER: true }));
  });

  it('should keep ADMIN_USER disabled when the MaaS authorization endpoint denies access', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { allowed: false } }),
    } as Response);

    renderProvider();

    await waitFor(() => expect(setFeatureFlags).toHaveBeenCalledWith({ ADMIN_USER: false }));
  });

  it('should keep ADMIN_USER disabled when the MaaS authorization check fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    renderProvider();

    await waitFor(() => expect(setFeatureFlags).toHaveBeenCalledWith({ ADMIN_USER: false }));
  });

  it('should keep ADMIN_USER disabled when the MaaS authorization endpoint returns an error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false } as Response);

    renderProvider();

    await waitFor(() => expect(setFeatureFlags).toHaveBeenCalledWith({ ADMIN_USER: false }));
  });

  it('shows Model Access only when whoami reports an administrator', async () => {
    window.__MAAS_CONSUMER_PORTAL_GRID__ = true;
    mockGetMaaSWhoAmI.mockReturnValue(jest.fn().mockResolvedValue({ isAdmin: true }));

    renderProvider();

    await waitFor(() =>
      expect(setFeatureFlags).toHaveBeenCalledWith({ MAAS_MODEL_ACCESS_ADMIN: true }),
    );
  });

  it('keeps Model Access hidden when whoami reports a non-administrator', async () => {
    window.__MAAS_CONSUMER_PORTAL_GRID__ = true;

    renderProvider();

    await waitFor(() =>
      expect(setFeatureFlags).toHaveBeenCalledWith({ MAAS_MODEL_ACCESS_ADMIN: false }),
    );
  });

  it('keeps Model Access hidden when whoami fails', async () => {
    mockGetMaaSWhoAmI.mockReturnValue(jest.fn().mockRejectedValue(new Error('Network error')));

    renderProvider();

    await waitFor(() => expect(mockGetMaaSWhoAmI).toHaveBeenCalled());
    expect(setFeatureFlags).not.toHaveBeenCalledWith({ MAAS_MODEL_ACCESS_ADMIN: true });
  });
});

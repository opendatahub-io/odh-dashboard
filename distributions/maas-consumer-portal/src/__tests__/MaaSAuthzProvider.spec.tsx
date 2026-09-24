import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { usePluginStore } from '@openshift/dynamic-plugin-sdk';
import MaaSAuthzProvider from '../MaaSAuthzProvider';

jest.mock('@openshift/dynamic-plugin-sdk', () => ({
  usePluginStore: jest.fn(),
}));

const mockUsePluginStore = jest.mocked(usePluginStore);
const setFeatureFlags = jest.fn();

describe('MaaSAuthzProvider', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    jest.clearAllMocks();
    mockUsePluginStore.mockReturnValue({ setFeatureFlags } as unknown as ReturnType<
      typeof usePluginStore
    >);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const renderProvider = (): void => {
    render(
      <MaaSAuthzProvider>
        <div />
      </MaaSAuthzProvider>,
    );
  };

  it('should enable ADMIN_USER only when the MaaS authorization endpoint allows access', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { allowed: true } }),
    } as Response);

    renderProvider();

    expect(global.fetch).toHaveBeenCalledWith('/maas/api/v1/is-maas-admin');
    expect(setFeatureFlags).toHaveBeenCalledWith({ ADMIN_USER: false });
    await waitFor(() => expect(setFeatureFlags).toHaveBeenCalledTimes(2));
    expect(setFeatureFlags).toHaveBeenLastCalledWith({ ADMIN_USER: true });
  });

  it('should keep ADMIN_USER disabled when the MaaS authorization endpoint denies access', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { allowed: false } }),
    } as Response);

    renderProvider();

    await waitFor(() => expect(setFeatureFlags).toHaveBeenCalledTimes(2));
    expect(setFeatureFlags).toHaveBeenLastCalledWith({ ADMIN_USER: false });
  });

  it('should keep ADMIN_USER disabled when the MaaS authorization check fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    renderProvider();

    await waitFor(() => expect(setFeatureFlags).toHaveBeenCalledTimes(2));
    expect(setFeatureFlags).toHaveBeenLastCalledWith({ ADMIN_USER: false });
  });

  it('should keep ADMIN_USER disabled when the MaaS authorization endpoint returns an error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false } as Response);

    renderProvider();

    await waitFor(() => expect(setFeatureFlags).toHaveBeenCalledTimes(2));
    expect(setFeatureFlags).toHaveBeenLastCalledWith({ ADMIN_USER: false });
  });
});

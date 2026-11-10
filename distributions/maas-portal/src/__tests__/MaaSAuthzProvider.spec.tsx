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
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMaaSWhoAmI.mockReturnValue(jest.fn().mockResolvedValue({ isAdmin: false }));
    mockUsePluginStore.mockReturnValue({ setFeatureFlags } as unknown as ReturnType<
      typeof usePluginStore
    >);
  });

  const renderProvider = (): void => {
    render(
      <MaaSAuthzProvider>
        <div />
      </MaaSAuthzProvider>,
    );
  };

  it('enables both MaaS admin flags from the SSO identity', async () => {
    mockGetMaaSWhoAmI.mockReturnValue(jest.fn().mockResolvedValue({ isAdmin: true }));

    renderProvider();

    await waitFor(() => expect(setFeatureFlags).toHaveBeenCalledWith({ ADMIN_USER: true }));
    expect(setFeatureFlags).toHaveBeenCalledWith({ MAAS_MODEL_ACCESS_ADMIN: true });
  });

  it('keeps both MaaS admin flags disabled when whoami fails', async () => {
    mockGetMaaSWhoAmI.mockReturnValue(jest.fn().mockRejectedValue(new Error('Network error')));

    renderProvider();

    await waitFor(() => expect(mockGetMaaSWhoAmI).toHaveBeenCalled());
    expect(setFeatureFlags).toHaveBeenCalledWith({
      ADMIN_USER: false,
      MAAS_MODEL_ACCESS_ADMIN: false,
    });
    expect(setFeatureFlags).not.toHaveBeenCalledWith({ MAAS_MODEL_ACCESS_ADMIN: true });
  });
});

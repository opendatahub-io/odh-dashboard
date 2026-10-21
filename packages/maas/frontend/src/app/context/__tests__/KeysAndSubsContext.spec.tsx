/* eslint-disable camelcase */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { type ConfigSettings } from 'mod-arch-core';
import { listUserSubscriptions } from '~/app/api/subscriptions';
import { getIsMaasAdmin } from '~/app/api/k8s';
import { searchApiKeys, searchTenantApiKeys } from '~/app/api/api-keys';
import { AppContext } from '~/app/context/AppContext';
import { KeysAndSubsProvider, useKeysAndSubsContext } from '~/app/context/KeysAndSubsContext';

jest.mock('~/app/api/subscriptions', () => ({ listUserSubscriptions: jest.fn() }));
jest.mock('~/app/api/k8s', () => ({ getIsMaasAdmin: jest.fn() }));
jest.mock('~/app/api/api-keys', () => ({
  searchApiKeys: jest.fn(),
  searchTenantApiKeys: jest.fn(),
}));
jest.mock('~/app/hooks/useApiKeyConfig', () => ({
  useApiKeyConfig: () => [
    { max_expiration_days: 90, ephemeral_max_expiration: '1h' },
    true,
    undefined,
    jest.fn(),
  ],
}));
jest.mock('~/app/hooks/useMaaSGatewayUrl', () => ({
  useMaaSGatewayUrl: () => ['https://example.com', true, undefined, jest.fn()],
}));

const config: ConfigSettings = { common: { featureFlags: { modelRegistry: false } } };

const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
  <AppContext.Provider value={{ config, user: { userId: 'user-123', orgAdmin: true } }}>
    <KeysAndSubsProvider>{children}</KeysAndSubsProvider>
  </AppContext.Provider>
);

describe('KeysAndSubsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.__MAAS_CONSUMER_PORTAL_GRID__ = true;
    jest.mocked(listUserSubscriptions).mockReturnValue(jest.fn().mockResolvedValue([]));
    jest
      .mocked(searchTenantApiKeys)
      .mockReturnValue(jest.fn().mockResolvedValue({ object: 'list', data: [], has_more: false }));
  });

  afterEach(() => {
    window.__MAAS_CONSUMER_PORTAL_GRID__ = undefined;
  });

  it('should expose Grid organization admin status without a Kubernetes check', async () => {
    const { result } = renderHook(useKeysAndSubsContext, { wrapper });

    await waitFor(() => expect(result.current.isMaasAdminLoaded).toBe(true));
    expect(result.current.isMaasAdmin).toBe(true);
    expect(getIsMaasAdmin).not.toHaveBeenCalled();
    expect(searchApiKeys).not.toHaveBeenCalled();
    expect(searchTenantApiKeys).toHaveBeenCalled();
  });

  it('should use the Kubernetes admin check when Grid is off', async () => {
    window.__MAAS_CONSUMER_PORTAL_GRID__ = false;
    jest.mocked(getIsMaasAdmin).mockReturnValue(jest.fn().mockResolvedValue({ allowed: false }));
    jest
      .mocked(searchApiKeys)
      .mockReturnValue(jest.fn().mockResolvedValue({ object: 'list', data: [], has_more: false }));

    const { result } = renderHook(useKeysAndSubsContext, { wrapper });

    await waitFor(() => expect(result.current.isMaasAdminLoaded).toBe(true));
    expect(result.current.isMaasAdmin).toBe(false);
    expect(getIsMaasAdmin).toHaveBeenCalled();
    expect(searchApiKeys).toHaveBeenCalled();
    expect(searchTenantApiKeys).not.toHaveBeenCalled();
  });
});

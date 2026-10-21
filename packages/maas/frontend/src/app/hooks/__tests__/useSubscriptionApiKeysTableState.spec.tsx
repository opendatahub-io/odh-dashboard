/* eslint-disable camelcase */
import { renderHook, waitFor } from '@testing-library/react';
import { searchApiKeys, searchTenantApiKeys } from '~/app/api/api-keys';
import { useSubscriptionApiKeysTableState } from '~/app/hooks/useSubscriptionApiKeysTableState';

jest.mock('~/app/api/api-keys', () => ({
  searchApiKeys: jest.fn(),
  searchTenantApiKeys: jest.fn(),
}));

const response = { object: 'list', data: [], has_more: false };

describe('useSubscriptionApiKeysTableState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.__MAAS_CONSUMER_PORTAL_GRID__ = undefined;
    window.sessionStorage.removeItem('odh-maas-portal-feature-flags');
    window.history.replaceState({}, '', '/');
    jest.mocked(searchApiKeys).mockReturnValue(jest.fn().mockResolvedValue(response));
    jest.mocked(searchTenantApiKeys).mockReturnValue(jest.fn().mockResolvedValue(response));
  });

  afterEach(() => {
    window.__MAAS_CONSUMER_PORTAL_GRID__ = undefined;
  });

  it('should use tenant search for subscription details in Grid mode', async () => {
    window.__MAAS_CONSUMER_PORTAL_GRID__ = true;

    const { result } = renderHook(() => useSubscriptionApiKeysTableState('premium-team-sub'));

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(searchTenantApiKeys).toHaveBeenCalledTimes(1);
    expect(searchApiKeys).not.toHaveBeenCalled();
  });

  it('should keep legacy search for subscription details when Grid is off', async () => {
    window.__MAAS_CONSUMER_PORTAL_GRID__ = false;

    const { result } = renderHook(() => useSubscriptionApiKeysTableState('premium-team-sub'));

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(searchApiKeys).toHaveBeenCalledTimes(1);
    expect(searchTenantApiKeys).not.toHaveBeenCalled();
  });
});

/* eslint-disable camelcase */
import { renderHook, waitFor } from '@testing-library/react';
import { searchTenantApiKeys } from '~/app/api/api-keys';
import { useSubscriptionApiKeysTableState } from '~/app/hooks/useSubscriptionApiKeysTableState';

jest.mock('~/app/api/api-keys', () => ({
  searchTenantApiKeys: jest.fn(),
}));

const response = { object: 'list', data: [], has_more: false };

describe('useSubscriptionApiKeysTableState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(searchTenantApiKeys).mockReturnValue(jest.fn().mockResolvedValue(response));
  });

  it('should always use tenant search for subscription details', async () => {
    const { result } = renderHook(() => useSubscriptionApiKeysTableState('premium-team-sub'));

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(searchTenantApiKeys).toHaveBeenCalledTimes(1);
  });
});

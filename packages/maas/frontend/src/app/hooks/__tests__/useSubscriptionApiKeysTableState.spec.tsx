/* eslint-disable camelcase */
import { renderHook, waitFor } from '@testing-library/react';
import { searchApiKeysForCurrentHost } from '~/app/api/api-keys';
import { useSubscriptionApiKeysTableState } from '~/app/hooks/useSubscriptionApiKeysTableState';

jest.mock('~/app/api/api-keys', () => ({
  searchApiKeysForCurrentHost: jest.fn(),
}));

const response = { object: 'list', data: [], has_more: false };

describe('useSubscriptionApiKeysTableState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(searchApiKeysForCurrentHost).mockReturnValue(jest.fn().mockResolvedValue(response));
  });

  it('should use the host-specific search contract for subscription details', async () => {
    const { result } = renderHook(() => useSubscriptionApiKeysTableState('premium-team-sub'));

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(searchApiKeysForCurrentHost).toHaveBeenCalledTimes(1);
  });
});

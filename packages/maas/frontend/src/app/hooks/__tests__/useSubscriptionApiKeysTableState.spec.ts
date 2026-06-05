/* eslint-disable camelcase */
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { APIKeyListResponse } from '~/app/types/api-key';
import { useSubscriptionApiKeysTableState } from '~/app/hooks/useSubscriptionApiKeysTableState';
import { useFetchApiKeys } from '~/app/hooks/useFetchApiKeys';

jest.mock('~/app/hooks/useFetchApiKeys', () => ({
  useFetchApiKeys: jest.fn(),
}));

const mockUseFetchApiKeys = jest.mocked(useFetchApiKeys);

const emptyResponse: APIKeyListResponse = {
  object: 'list',
  data: [],
  has_more: false,
};

const mockRefresh = jest.fn();

describe('useSubscriptionApiKeysTableState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchApiKeys.mockReturnValue([emptyResponse, true, undefined, mockRefresh]);
  });

  it('should return default sort state', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');
    const result = renderResult.result.current;

    expect(result.sortField).toBe('created_at');
    expect(result.sortDirection).toBe('desc');
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(5);
  });

  it('should include sort params in search request', () => {
    testHook(useSubscriptionApiKeysTableState)('sub-1');

    expect(mockUseFetchApiKeys).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { subscription: 'sub-1', status: ['active', 'expired'] },
        sort: { by: 'created_at', order: 'desc' },
        pagination: { limit: 5, offset: 0 },
      }),
    );
  });

  it('should update sort field and direction when onSort is called', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    renderResult.result.current.onSort('name', 'asc');

    expect(renderResult.result.current.sortField).toBe('name');
    expect(renderResult.result.current.sortDirection).toBe('asc');
    expect(renderResult.result.current.page).toBe(1);
    expect(renderResult.result.current.isFetching).toBe(true);
  });

  it('should reset page to 1 when sort changes', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    renderResult.result.current.onSetPage(3);
    expect(renderResult.result.current.page).toBe(3);

    renderResult.result.current.onSort('expires_at', 'asc');
    expect(renderResult.result.current.page).toBe(1);
    expect(renderResult.result.current.sortField).toBe('expires_at');
  });

  it('should pass updated sort to search request after onSort', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    renderResult.result.current.onSort('last_used_at', 'asc');

    expect(mockUseFetchApiKeys).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sort: { by: 'last_used_at', order: 'asc' },
      }),
    );
  });

  it('should update page when onSetPage is called', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    renderResult.result.current.onSetPage(2);

    expect(renderResult.result.current.page).toBe(2);
    expect(renderResult.result.current.isFetching).toBe(true);
  });

  it('should update perPage and page when onPerPageSelect is called', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    renderResult.result.current.onPerPageSelect(10, 1);

    expect(renderResult.result.current.perPage).toBe(10);
    expect(renderResult.result.current.page).toBe(1);
    expect(renderResult.result.current.isFetching).toBe(true);
  });

  it('should pass empty search request when subscriptionId is empty', () => {
    testHook(useSubscriptionApiKeysTableState)('');

    expect(mockUseFetchApiKeys).toHaveBeenCalledWith({
      pagination: { limit: 0, offset: 0 },
    });
  });

  it('should expose response, loaded, and error from useFetchApiKeys', () => {
    const error = new Error('fetch failed');
    mockUseFetchApiKeys.mockReturnValue([emptyResponse, false, error, mockRefresh]);

    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');
    const result = renderResult.result.current;

    expect(result.response).toBe(emptyResponse);
    expect(result.loaded).toBe(false);
    expect(result.error).toBe(error);
  });
});

/* eslint-disable camelcase */
import { act } from '@testing-library/react';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { APIKeyListResponse } from '~/app/types/api-key';
import { ApiKeySortField } from '~/app/pages/keys-and-subs/apiKeys/allKeys/columns';
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

    act(() => {
      renderResult.result.current.onSort('name', 'asc');
    });

    expect(renderResult.result.current.sortField).toBe('name');
    expect(renderResult.result.current.sortDirection).toBe('asc');
    expect(renderResult.result.current.page).toBe(1);
    expect(renderResult.result.current.isFetching).toBe(true);
  });

  it('should reset page to 1 when sort changes', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    act(() => {
      renderResult.result.current.onSetPage(3);
    });
    expect(renderResult.result.current.page).toBe(3);

    act(() => {
      renderResult.result.current.onSort('expires_at', 'asc');
    });
    expect(renderResult.result.current.page).toBe(1);
    expect(renderResult.result.current.sortField).toBe('expires_at');
  });

  it('should pass updated sort to search request after onSort', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    act(() => {
      renderResult.result.current.onSort('last_used_at', 'asc');
    });

    expect(mockUseFetchApiKeys).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sort: { by: 'last_used_at', order: 'asc' },
      }),
    );
  });

  it('should update page when onSetPage is called', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    act(() => {
      renderResult.result.current.onSetPage(2);
    });

    expect(renderResult.result.current.page).toBe(2);
    expect(renderResult.result.current.isFetching).toBe(true);
  });

  it('should update perPage and page when onPerPageSelect is called', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    act(() => {
      renderResult.result.current.onPerPageSelect(10, 1);
    });

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

  it('should reset page and isFetching when subscriptionId changes', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    act(() => {
      renderResult.result.current.onSetPage(3);
    });
    expect(renderResult.result.current.page).toBe(3);

    renderResult.rerender('sub-2');

    expect(renderResult.result.current.page).toBe(1);
    expect(renderResult.result.current.isFetching).toBe(false);
  });

  it('should clear isFetching when response changes', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    act(() => {
      renderResult.result.current.onSetPage(2);
    });
    expect(renderResult.result.current.isFetching).toBe(true);

    const newResponse: APIKeyListResponse = {
      object: 'list',
      data: [],
      has_more: true,
    };
    mockUseFetchApiKeys.mockReturnValue([newResponse, true, undefined, mockRefresh]);
    renderResult.rerender('sub-1');

    expect(renderResult.result.current.isFetching).toBe(false);
  });

  it('should clamp page to minimum of 1 for onSetPage', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    act(() => {
      renderResult.result.current.onSetPage(0);
    });
    expect(renderResult.result.current.page).toBe(1);

    act(() => {
      renderResult.result.current.onSetPage(-1);
    });
    expect(renderResult.result.current.page).toBe(1);
  });

  it('should clamp page to minimum of 1 for onPerPageSelect', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    act(() => {
      renderResult.result.current.onPerPageSelect(10, 0);
    });
    expect(renderResult.result.current.page).toBe(1);
  });

  it('should expose the refresh function from useFetchApiKeys', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');
    renderResult.result.current.refresh();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('should update search request with descending sort direction', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    act(() => {
      renderResult.result.current.onSort('expires_at', 'desc');
    });

    expect(mockUseFetchApiKeys).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sort: { by: 'expires_at', order: 'desc' },
        pagination: { limit: 5, offset: 0 },
      }),
    );
  });

  it('should toggle sort direction on the same field', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    act(() => {
      renderResult.result.current.onSort('name', 'asc');
    });
    expect(renderResult.result.current.sortField).toBe('name');
    expect(renderResult.result.current.sortDirection).toBe('asc');

    act(() => {
      renderResult.result.current.onSort('name', 'desc');
    });
    expect(renderResult.result.current.sortField).toBe('name');
    expect(renderResult.result.current.sortDirection).toBe('desc');

    expect(mockUseFetchApiKeys).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sort: { by: 'name', order: 'desc' },
      }),
    );
  });

  it('should include sort params in search request after perPage change', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    act(() => {
      renderResult.result.current.onSort('expires_at', 'asc');
    });

    act(() => {
      renderResult.result.current.onPerPageSelect(10, 1);
    });

    expect(mockUseFetchApiKeys).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sort: { by: 'expires_at', order: 'asc' },
        pagination: { limit: 10, offset: 0 },
      }),
    );
  });

  it('should reset pagination offset to 0 after changing page and then sorting', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    act(() => {
      renderResult.result.current.onSetPage(3);
    });

    expect(mockUseFetchApiKeys).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pagination: { limit: 5, offset: 10 },
      }),
    );

    act(() => {
      renderResult.result.current.onSort('name', 'asc');
    });

    expect(mockUseFetchApiKeys).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sort: { by: 'name', order: 'asc' },
        pagination: { limit: 5, offset: 0 },
      }),
    );
  });

  it('should maintain stable onSort callback reference across re-renders', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');
    const firstOnSort = renderResult.result.current.onSort;

    renderResult.rerender('sub-1');
    expect(renderResult.result.current.onSort).toBe(firstOnSort);
  });

  it('should set all sort state atomically when onSort is called', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    expect(renderResult.result.current.sortField).toBe('created_at');
    expect(renderResult.result.current.sortDirection).toBe('desc');
    expect(renderResult.result.current.isFetching).toBe(false);

    act(() => {
      renderResult.result.current.onSort('last_used_at', 'desc');
    });

    const result = renderResult.result.current;
    expect(result.sortField).toBe('last_used_at');
    expect(result.sortDirection).toBe('desc');
    expect(result.page).toBe(1);
    expect(result.isFetching).toBe(true);
  });

  it('should sort by each supported field', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    const fields: Array<{ field: ApiKeySortField; direction: 'asc' | 'desc' }> = [
      { field: 'name', direction: 'asc' },
      { field: 'created_at', direction: 'desc' },
      { field: 'expires_at', direction: 'asc' },
      { field: 'last_used_at', direction: 'desc' },
    ];

    for (const { field, direction } of fields) {
      act(() => {
        renderResult.result.current.onSort(field, direction);
      });

      expect(renderResult.result.current.sortField).toBe(field);
      expect(renderResult.result.current.sortDirection).toBe(direction);
      expect(renderResult.result.current.page).toBe(1);
      expect(renderResult.result.current.isFetching).toBe(true);

      expect(mockUseFetchApiKeys).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sort: { by: field, order: direction },
        }),
      );
    }
  });

  it('should set isFetching true and reset page inside onSort callback', () => {
    const renderResult = testHook(useSubscriptionApiKeysTableState)('sub-1');

    act(() => {
      renderResult.result.current.onSetPage(5);
    });
    expect(renderResult.result.current.page).toBe(5);
    expect(renderResult.result.current.isFetching).toBe(true);

    const newResponse: APIKeyListResponse = {
      object: 'list',
      data: [],
      has_more: false,
    };
    mockUseFetchApiKeys.mockReturnValue([newResponse, true, undefined, mockRefresh]);
    renderResult.rerender('sub-1');
    expect(renderResult.result.current.isFetching).toBe(false);

    act(() => {
      renderResult.result.current.onSort('name', 'asc');
    });
    expect(renderResult.result.current.page).toBe(1);
    expect(renderResult.result.current.isFetching).toBe(true);
    expect(renderResult.result.current.sortField).toBe('name');
    expect(renderResult.result.current.sortDirection).toBe('asc');
  });
});

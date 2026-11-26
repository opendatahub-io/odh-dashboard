import * as React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useApiKeysTableState } from '~/app/hooks/useApiKeysTableState';
import { useFetchApiKeys } from '~/app/hooks/useFetchApiKeys';
import type { APIKeyDisplayStatus, APIKeyListResponse } from '~/app/types/api-key';
import { TrackingProvider } from '~/__tests__/unit/testUtils/TrackingProvider';

jest.mock('~/app/hooks/useFetchApiKeys');
jest.mock('~/app/context/KeysAndSubsContext', () => ({
  useKeysAndSubsContext: () => ({ subscriptions: [] }),
}));

const makeResponse = (count: number): APIKeyListResponse => ({
  object: 'list',
  // eslint-disable-next-line camelcase
  has_more: false,
  data: Array.from({ length: count }, (_, i) => ({
    id: `key-${i}`,
    name: `key-${i}`,
    status: 'active',
    creationDate: '2026-01-01T00:00:00Z',
  })),
});

const setFetchResult = (response: APIKeyListResponse, loaded: boolean): void => {
  jest.mocked(useFetchApiKeys).mockReturnValue([response, loaded, undefined, jest.fn()]);
};

describe('useApiKeysTableState tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setFetchResult(makeResponse(1), true);
  });

  it('should emit the search event once after the filtered response loads', () => {
    const trackEvent = jest.fn();
    const { result, rerender } = renderHook(useApiKeysTableState, {
      wrapper: ({ children }) => (
        <TrackingProvider trackEvent={trackEvent}>{children}</TrackingProvider>
      ),
    });

    act(() => {
      result.current.onUsernameChange('alice');
    });
    expect(trackEvent).not.toHaveBeenCalled();

    setFetchResult(makeResponse(3), true);
    rerender();

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('API Keys Search Applied', {
      hasQuery: true,
      resultCount: 3,
      isAdmin: true,
    });
  });

  it('should suppress repeat events after a completed search', () => {
    const first = jest.fn();
    const replacement = jest.fn();
    // The wrapper reads `current` on every render, so swapping it and rerendering
    // hands the hook a new provider callback identity.
    let current = first;
    const { result, rerender } = renderHook(useApiKeysTableState, {
      wrapper: ({ children }) => (
        <TrackingProvider trackEvent={current}>{children}</TrackingProvider>
      ),
    });

    // Complete a search so the completion event fires exactly once and the
    // pending-search guard is cleared.
    act(() => {
      result.current.onUsernameChange('alice');
    });
    setFetchResult(makeResponse(3), true);
    rerender();
    expect(first).toHaveBeenCalledTimes(1);

    // Subsequent responses (for example, polling) and a replaced provider callback
    // must not re-emit the search-completion event.
    current = replacement;
    rerender();
    setFetchResult(makeResponse(2), true);
    rerender();
    setFetchResult(makeResponse(4), true);
    rerender();

    expect(first).toHaveBeenCalledTimes(1);
    expect(replacement).not.toHaveBeenCalled();

    // A new search after the provider swap should use the replacement callback.
    act(() => {
      result.current.onUsernameChange('bob');
    });
    setFetchResult(makeResponse(5), true);
    rerender();

    expect(first).toHaveBeenCalledTimes(1);
    expect(replacement).toHaveBeenCalledTimes(1);
    expect(replacement).toHaveBeenCalledWith('API Keys Search Applied', {
      hasQuery: true,
      resultCount: 5,
      isAdmin: true,
    });
  });

  it('should track status-filter selections through the injected callback', () => {
    const trackEvent = jest.fn();
    const { result } = renderHook(useApiKeysTableState, {
      wrapper: ({ children }) => (
        <TrackingProvider trackEvent={trackEvent}>{children}</TrackingProvider>
      ),
    });

    act(() => {
      result.current.onStatusToggle('revoked');
    });

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('API Keys Status Filter Applied', {
      selectedStatuses: JSON.stringify(['active', 'inactive', 'expired', 'revoked']),
      selectedCount: 4,
    });
  });

  it.each<{
    action: 'onStatusToggle' | 'onStatusClear';
    status: APIKeyDisplayStatus;
    expectedStatuses: APIKeyDisplayStatus[];
  }>([
    {
      action: 'onStatusToggle',
      status: 'revoked',
      expectedStatuses: ['active', 'inactive', 'expired', 'revoked'],
    },
    {
      action: 'onStatusToggle',
      status: 'expired',
      expectedStatuses: ['active', 'inactive'],
    },
    {
      action: 'onStatusClear',
      status: 'expired',
      expectedStatuses: ['active', 'inactive'],
    },
  ])(
    'should preserve filters and emit once for $action($status) under Strict Mode',
    ({ action, status, expectedStatuses }) => {
      const trackEvent = jest.fn();
      const { result, rerender } = renderHook(useApiKeysTableState, {
        wrapper: ({ children }) => (
          <React.StrictMode>
            <TrackingProvider trackEvent={trackEvent}>{children}</TrackingProvider>
          </React.StrictMode>
        ),
      });

      act(() => {
        result.current.onUsernameChange('alice');
        result.current.onSubscriptionChange('subscription-1');
        result.current.onPerPageSelect(10, 3);
      });
      setFetchResult(makeResponse(2), true);
      rerender();
      expect(result.current.page).toBe(3);
      expect(result.current.isFetching).toBe(false);
      trackEvent.mockClear();

      act(() => {
        result.current[action](status);
      });

      expect(result.current.filterData).toEqual({
        username: 'alice',
        subscription: 'subscription-1',
        statuses: expectedStatuses,
      });
      expect(result.current.page).toBe(1);
      expect(result.current.perPage).toBe(10);
      expect(result.current.isFetching).toBe(true);
      expect(trackEvent).toHaveBeenCalledTimes(1);
      expect(trackEvent).toHaveBeenCalledWith('API Keys Status Filter Applied', {
        selectedStatuses: JSON.stringify(expectedStatuses),
        selectedCount: expectedStatuses.length,
      });

      setFetchResult(makeResponse(3), true);
      rerender();
      expect(result.current.isFetching).toBe(false);
      expect(trackEvent).toHaveBeenCalledTimes(1);
    },
  );
});

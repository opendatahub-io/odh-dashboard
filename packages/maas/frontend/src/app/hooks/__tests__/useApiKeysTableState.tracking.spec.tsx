import * as React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useApiKeysTableState } from '~/app/hooks/useApiKeysTableState';
import { useFetchApiKeys } from '~/app/hooks/useFetchApiKeys';
import type { APIKeyListResponse } from '~/app/types/api-key';
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

describe('useApiKeysTableState search tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setFetchResult(makeResponse(1), true);
  });

  it('should emit the search event once after the filtered response loads', async () => {
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
});

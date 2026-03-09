// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { useFetchState } from 'mod-arch-core';
import { useProviders } from '~/app/hooks/useProviders';
import { getProviders } from '~/app/api/k8s';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import type { Provider } from '~/app/types';

jest.mock('mod-arch-core', () => ({
  useFetchState: jest.fn(),
}));

jest.mock('~/app/api/k8s', () => ({
  getProviders: jest.fn(),
}));

const mockUseFetchState = jest.mocked(useFetchState);
const mockGetProviders = jest.mocked(getProviders);

describe('useProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProviders.mockReturnValue(jest.fn());
    mockUseFetchState.mockReturnValue([[], false, undefined, jest.fn()]);
  });

  it('should return loading state with empty providers', () => {
    const renderResult = testHook(useProviders)('test-namespace');

    expect(renderResult).hookToStrictEqual({
      providers: [],
      loaded: false,
      loadError: undefined,
    });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should return providers when loaded', () => {
    const providers: Provider[] = [{ resource: { id: 'prov-1' }, name: 'Test Provider' }];
    mockUseFetchState.mockReturnValue([providers, true, undefined, jest.fn()]);

    const renderResult = testHook(useProviders)('test-namespace');

    expect(renderResult).hookToStrictEqual({
      providers,
      loaded: true,
      loadError: undefined,
    });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should return loadError when fetch fails', () => {
    const loadError = new Error('Failed to fetch providers');
    mockUseFetchState.mockReturnValue([[], false, loadError, jest.fn()]);

    const renderResult = testHook(useProviders)('test-namespace');

    expect(renderResult).hookToStrictEqual({
      providers: [],
      loaded: false,
      loadError,
    });
  });

  it('should call getProviders with empty hostPath and the provided namespace', () => {
    const mockFetcher = jest.fn().mockResolvedValue([]);
    mockGetProviders.mockReturnValue(mockFetcher);

    testHook(useProviders)('my-namespace');

    const [fetchCallback] = mockUseFetchState.mock.calls[0] as unknown as [
      (opts: unknown) => Promise<Provider[]>,
    ];
    const mockOpts = {};
    fetchCallback(mockOpts);

    expect(mockGetProviders).toHaveBeenCalledWith('', 'my-namespace');
    expect(mockFetcher).toHaveBeenCalledWith(mockOpts);
  });

  it('should pass initialPromisePurity option to useFetchState', () => {
    testHook(useProviders)('test-namespace');

    expect(mockUseFetchState).toHaveBeenCalledWith(expect.any(Function), [], {
      initialPromisePurity: true,
    });
  });

  it('should pass updated namespace to getProviders when namespace changes', () => {
    const mockFetcher = jest.fn().mockResolvedValue([]);
    mockGetProviders.mockReturnValue(mockFetcher);

    const renderResult = testHook(useProviders)('namespace-a');
    renderResult.rerender('namespace-b');

    // After rerender, useFetchState was called again with a new callback
    const lastCallIndex = mockUseFetchState.mock.calls.length - 1;
    const [updatedCallback] = mockUseFetchState.mock.calls[lastCallIndex] as unknown as [
      (opts: unknown) => Promise<Provider[]>,
    ];
    updatedCallback({});

    expect(mockGetProviders).toHaveBeenCalledWith('', 'namespace-b');
  });
});

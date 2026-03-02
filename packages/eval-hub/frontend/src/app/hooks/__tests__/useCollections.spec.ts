// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { useFetchState } from 'mod-arch-core';
import { useCollections } from '~/app/hooks/useCollections';
import { getCollections } from '~/app/api/k8s';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import type { Collection } from '~/app/types';

jest.mock('mod-arch-core', () => ({
  useFetchState: jest.fn(),
}));

jest.mock('~/app/api/k8s', () => ({
  getCollections: jest.fn(),
}));

const mockUseFetchState = jest.mocked(useFetchState);
const mockGetCollections = jest.mocked(getCollections);

describe('useCollections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCollections.mockReturnValue(jest.fn());
    mockUseFetchState.mockReturnValue([[], false, undefined, jest.fn()]);
  });

  it('should return loading state with empty collections', () => {
    const renderResult = testHook(useCollections)('test-namespace');

    expect(renderResult).hookToStrictEqual({
      collections: [],
      loaded: false,
      loadError: undefined,
    });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should return collections when loaded', () => {
    const collections: Collection[] = [{ resource: { id: 'col-1' }, name: 'Test Collection' }];
    mockUseFetchState.mockReturnValue([collections, true, undefined, jest.fn()]);

    const renderResult = testHook(useCollections)('test-namespace');

    expect(renderResult).hookToStrictEqual({
      collections,
      loaded: true,
      loadError: undefined,
    });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should return loadError when fetch fails', () => {
    const loadError = new Error('Failed to fetch collections');
    mockUseFetchState.mockReturnValue([[], false, loadError, jest.fn()]);

    const renderResult = testHook(useCollections)('test-namespace');

    expect(renderResult).hookToStrictEqual({
      collections: [],
      loaded: false,
      loadError,
    });
  });

  it('should call getCollections with empty hostPath and the provided namespace', () => {
    const mockFetcher = jest.fn().mockResolvedValue([]);
    mockGetCollections.mockReturnValue(mockFetcher);

    testHook(useCollections)('my-namespace');

    const [fetchCallback] = mockUseFetchState.mock.calls[0] as unknown as [
      (opts: unknown) => Promise<Collection[]>,
    ];
    const mockOpts = {};
    fetchCallback(mockOpts);

    expect(mockGetCollections).toHaveBeenCalledWith('', 'my-namespace');
    expect(mockFetcher).toHaveBeenCalledWith(mockOpts);
  });

  it('should pass initialPromisePurity option to useFetchState', () => {
    testHook(useCollections)('test-namespace');

    expect(mockUseFetchState).toHaveBeenCalledWith(expect.any(Function), [], {
      initialPromisePurity: true,
    });
  });

  it('should pass updated namespace to getCollections when namespace changes', () => {
    const mockFetcher = jest.fn().mockResolvedValue([]);
    mockGetCollections.mockReturnValue(mockFetcher);

    const renderResult = testHook(useCollections)('namespace-a');
    renderResult.rerender('namespace-b');

    // After rerender, useFetchState was called again with a new callback
    const lastCallIndex = mockUseFetchState.mock.calls.length - 1;
    const [updatedCallback] = mockUseFetchState.mock.calls[lastCallIndex] as unknown as [
      (opts: unknown) => Promise<Collection[]>,
    ];
    updatedCallback({});

    expect(mockGetCollections).toHaveBeenCalledWith('', 'namespace-b');
  });
});

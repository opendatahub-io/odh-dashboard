// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { act } from '@testing-library/react';
import { useCollections } from '~/app/hooks/useCollections';
import { useCollectionsContext } from '~/app/context/CollectionsContext';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import type { Collection, CollectionsListResponse } from '~/app/types';

jest.mock('~/app/context/CollectionsContext', () => ({
  useCollectionsContext: jest.fn(),
}));

const mockUseCollectionsContext = jest.mocked(useCollectionsContext);

const emptyResponse: CollectionsListResponse = { items: [] };
const mockRefresh = jest.fn();

describe('useCollections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCollectionsContext.mockReturnValue({
      response: emptyResponse,
      loaded: false,
      loadError: undefined,
      refresh: mockRefresh,
    });
  });

  it('should return loading state with empty collections', () => {
    const renderResult = testHook(useCollections)('test-namespace');

    expect(renderResult.result.current.collections).toEqual([]);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.loadError).toBeUndefined();
    expect(renderResult.result.current.totalCount).toBe(0);
    expect(renderResult.result.current.isTruncated).toBe(false);
  });

  it('should return collections when loaded', () => {
    const collections: Collection[] = [{ resource: { id: 'col-1' }, name: 'Test Collection' }];
    mockUseCollectionsContext.mockReturnValue({
      response: { items: collections },
      loaded: true,
      loadError: undefined,
      refresh: mockRefresh,
    });

    const renderResult = testHook(useCollections)('test-namespace');

    expect(renderResult.result.current.collections).toEqual(collections);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.totalCount).toBe(1);
  });

  it('should return loadError when fetch fails', () => {
    const loadError = new Error('Failed to fetch collections');
    mockUseCollectionsContext.mockReturnValue({
      response: emptyResponse,
      loaded: false,
      loadError,
      refresh: mockRefresh,
    });

    const renderResult = testHook(useCollections)('test-namespace');

    expect(renderResult.result.current.loadError).toBe(loadError);
  });

  it('should flag isTruncated when API total_count exceeds the fetch limit', () => {
    mockUseCollectionsContext.mockReturnValue({
      // eslint-disable-next-line camelcase
      response: { items: [], total_count: 250 },
      loaded: true,
      loadError: undefined,
      refresh: mockRefresh,
    });

    const renderResult = testHook(useCollections)('test-namespace');

    expect(renderResult.result.current.isTruncated).toBe(true);
  });

  it('should not flag isTruncated when total_count is within the fetch limit', () => {
    mockUseCollectionsContext.mockReturnValue({
      // eslint-disable-next-line camelcase
      response: { items: [], total_count: 50 },
      loaded: true,
      loadError: undefined,
      refresh: mockRefresh,
    });

    const renderResult = testHook(useCollections)('test-namespace');

    expect(renderResult.result.current.isTruncated).toBe(false);
  });

  it('should expose pagination controls', () => {
    const renderResult = testHook(useCollections)('test-namespace');

    expect(renderResult.result.current.page).toBe(1);
    expect(renderResult.result.current.pageSize).toBe(6);
    expect(typeof renderResult.result.current.setPage).toBe('function');
    expect(typeof renderResult.result.current.setPageSize).toBe('function');
  });

  it('should expose filter controls', () => {
    const renderResult = testHook(useCollections)('test-namespace');

    expect(renderResult.result.current.nameFilter).toBe('');
    expect(renderResult.result.current.categoryFilter).toBe('');
    expect(typeof renderResult.result.current.setNameFilter).toBe('function');
    expect(typeof renderResult.result.current.setCategoryFilter).toBe('function');
  });

  it('should reset to page 1 when setPageSize is called', () => {
    const renderResult = testHook(useCollections)('test-namespace');

    act(() => {
      renderResult.result.current.setPage(3);
    });
    expect(renderResult.result.current.page).toBe(3);

    act(() => {
      renderResult.result.current.setPageSize(12);
    });
    expect(renderResult.result.current.page).toBe(1);
    expect(renderResult.result.current.pageSize).toBe(12);
  });

  it('should filter collections by name client-side', () => {
    const collections: Collection[] = [
      { resource: { id: 'col-1' }, name: 'MMLU Benchmark' },
      { resource: { id: 'col-2' }, name: 'TruthfulQA Suite' },
      { resource: { id: 'col-3' }, name: 'MMLU Advanced' },
    ];
    mockUseCollectionsContext.mockReturnValue({
      response: { items: collections },
      loaded: true,
      loadError: undefined,
      refresh: mockRefresh,
    });

    const renderResult = testHook(useCollections)('test-namespace');

    act(() => {
      renderResult.result.current.setNameFilter('mmlu');
    });

    expect(renderResult.result.current.collections).toHaveLength(2);
    expect(renderResult.result.current.collections.map((c) => c.resource.id)).toEqual([
      'col-1',
      'col-3',
    ]);
    expect(renderResult.result.current.totalCount).toBe(2);
  });

  it('should filter collections by category client-side', () => {
    const collections: Collection[] = [
      { resource: { id: 'col-1' }, name: 'Bench A', category: 'language' },
      { resource: { id: 'col-2' }, name: 'Bench B', category: 'coding' },
      { resource: { id: 'col-3' }, name: 'Bench C', category: 'language' },
    ];
    mockUseCollectionsContext.mockReturnValue({
      response: { items: collections },
      loaded: true,
      loadError: undefined,
      refresh: mockRefresh,
    });

    const renderResult = testHook(useCollections)('test-namespace');

    act(() => {
      renderResult.result.current.setCategoryFilter('language');
    });

    expect(renderResult.result.current.collections).toHaveLength(2);
    expect(renderResult.result.current.totalCount).toBe(2);
  });

  it('should derive availableCategories from the full unfiltered list', () => {
    const collections: Collection[] = [
      { resource: { id: 'col-1' }, name: 'A', category: 'coding' },
      { resource: { id: 'col-2' }, name: 'B', category: 'language' },
      { resource: { id: 'col-3' }, name: 'C', category: 'coding' },
      { resource: { id: 'col-4' }, name: 'D' },
    ];
    mockUseCollectionsContext.mockReturnValue({
      response: { items: collections },
      loaded: true,
      loadError: undefined,
      refresh: mockRefresh,
    });

    const renderResult = testHook(useCollections)('test-namespace');

    act(() => {
      renderResult.result.current.setNameFilter('A');
    });

    // Even with an active name filter, all categories remain available
    expect(renderResult.result.current.availableCategories).toEqual(['coding', 'language']);
  });

  it('should paginate collections client-side', () => {
    const collections: Collection[] = Array.from({ length: 10 }, (_, i) => ({
      resource: { id: `col-${i}` },
      name: `Collection ${i}`,
    }));
    mockUseCollectionsContext.mockReturnValue({
      response: { items: collections },
      loaded: true,
      loadError: undefined,
      refresh: mockRefresh,
    });

    const renderResult = testHook(useCollections)('test-namespace');

    // Default page size is 6; first page should have 6 items
    expect(renderResult.result.current.collections).toHaveLength(6);
    expect(renderResult.result.current.totalCount).toBe(10);

    act(() => {
      renderResult.result.current.setPage(2);
    });

    expect(renderResult.result.current.collections).toHaveLength(4);
  });
});

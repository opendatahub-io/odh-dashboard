/* eslint-disable camelcase */
import { renderHook, act } from '@testing-library/react';
import { useFeatureStoreSearch } from '../useFeatureStoreSearch';
import useFeatureStoreProjects from '../useFeatureStoreProjects';
import useGlobalSearch from '../useGlobalSearch';
import { mockFeatureStoreProject } from '../../__mocks__/mockFeatureStoreProject';
import {
  mockGlobalSearchResponse,
  mockGlobalSearchPagination,
  mockGlobalSearchResult,
} from '../../__mocks__/mockGlobalSearch';

jest.mock('../useFeatureStoreProjects');
jest.mock('../useGlobalSearch');

const mockUseFeatureStoreProjects = jest.mocked(useFeatureStoreProjects);
const mockUseGlobalSearch = jest.mocked(useGlobalSearch);
const mockSearch = jest.fn();

describe('useFeatureStoreSearch', () => {
  const defaultProjects = {
    data: {
      projects: [mockFeatureStoreProject()],
      pagination: {
        page: 1,
        limit: 10,
        total_count: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
    },
    loaded: true,
    error: undefined,
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFeatureStoreProjects.mockReturnValue(defaultProjects);
    mockUseGlobalSearch.mockReturnValue({
      search: mockSearch,
      apiAvailable: true,
    });
  });

  it('should return searchErrors as empty array initially', () => {
    const { result } = renderHook(() => useFeatureStoreSearch());

    expect(result.current.searchErrors).toEqual([]);
    expect(result.current.isSearching).toBe(false);
    expect(result.current.convertedSearchData).toEqual([]);
  });

  it('should set searchErrors from successful search response', async () => {
    const searchResponse = mockGlobalSearchResponse({
      results: [mockGlobalSearchResult({ type: 'entity', name: 'test-entity' })],
      pagination: mockGlobalSearchPagination({ totalCount: 1, hasNext: false }),
      errors: ['partial search failure in project-x'],
    });

    mockSearch.mockResolvedValue(searchResponse);

    const { result } = renderHook(() => useFeatureStoreSearch());

    await act(async () => {
      await result.current.handleSearchChange('test');
    });

    expect(result.current.searchErrors).toEqual(['partial search failure in project-x']);
    expect(result.current.totalCount).toBe(1);
  });

  it('should clear searchErrors when query is empty', async () => {
    const searchResponse = mockGlobalSearchResponse({
      results: [mockGlobalSearchResult()],
      pagination: mockGlobalSearchPagination({ totalCount: 1 }),
      errors: ['some error'],
    });

    mockSearch.mockResolvedValue(searchResponse);

    const { result } = renderHook(() => useFeatureStoreSearch());

    // First, perform a search to populate errors
    await act(async () => {
      await result.current.handleSearchChange('test');
    });
    expect(result.current.searchErrors).toEqual(['some error']);

    // Clear by setting empty query
    await act(async () => {
      await result.current.handleSearchChange('');
    });

    expect(result.current.searchErrors).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it('should clear searchErrors on error', async () => {
    mockSearch.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useFeatureStoreSearch());

    await act(async () => {
      await result.current.handleSearchChange('test');
    });

    expect(result.current.searchErrors).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });

  it('should clear searchErrors when clearSearch is called', async () => {
    const searchResponse = mockGlobalSearchResponse({
      results: [mockGlobalSearchResult()],
      pagination: mockGlobalSearchPagination({ totalCount: 1 }),
      errors: ['search warning'],
    });

    mockSearch.mockResolvedValue(searchResponse);

    const { result } = renderHook(() => useFeatureStoreSearch());

    await act(async () => {
      await result.current.handleSearchChange('test');
    });
    expect(result.current.searchErrors).toEqual(['search warning']);

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchErrors).toEqual([]);
    expect(result.current.isSearching).toBe(false);
    expect(result.current.totalCount).toBe(0);
  });

  it('should convert search results correctly', async () => {
    const searchResponse = mockGlobalSearchResponse({
      results: [
        mockGlobalSearchResult({
          type: 'entity',
          name: 'user_id',
          description: 'A user ID entity',
          project: 'my-project',
          featureView: undefined,
          matched_tags: { pii: 'true' },
        }),
      ],
      pagination: mockGlobalSearchPagination({ totalCount: 1 }),
      errors: [],
    });

    mockSearch.mockResolvedValue(searchResponse);

    const { result } = renderHook(() => useFeatureStoreSearch());

    await act(async () => {
      await result.current.handleSearchChange('user');
    });

    expect(result.current.convertedSearchData).toEqual([
      {
        id: 'my-project-entity-user_id-0',
        title: 'user_id',
        description: 'A user ID entity',
        category: 'Entities',
        type: 'entity',
        project: 'my-project',
        featureView: undefined,
        matched_tags: { pii: 'true' },
      },
    ]);
  });

  it('should not search when no projects are available', async () => {
    mockUseFeatureStoreProjects.mockReturnValue({
      data: {
        projects: [],
        pagination: {
          page: 1,
          limit: 10,
          total_count: 0,
          total_pages: 0,
          has_next: false,
          has_previous: false,
        },
      },
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useFeatureStoreSearch());

    await act(async () => {
      await result.current.handleSearchChange('test');
    });

    expect(mockSearch).not.toHaveBeenCalled();
    expect(result.current.isSearching).toBe(false);
  });

  it('should not search when API is not available', async () => {
    mockUseGlobalSearch.mockReturnValue({
      search: mockSearch,
      apiAvailable: false,
    });

    const { result } = renderHook(() => useFeatureStoreSearch());

    await act(async () => {
      await result.current.handleSearchChange('test');
    });

    expect(mockSearch).not.toHaveBeenCalled();
    expect(result.current.searchErrors).toEqual([]);
  });

  it('should abort previous request when a new search is initiated', async () => {
    let resolveFirst: (value: unknown) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    const secondResponse = mockGlobalSearchResponse({
      results: [mockGlobalSearchResult({ name: 'second-result' })],
      pagination: mockGlobalSearchPagination({ totalCount: 1 }),
      errors: [],
    });

    mockSearch.mockImplementationOnce(() => firstPromise).mockResolvedValueOnce(secondResponse);

    const { result } = renderHook(() => useFeatureStoreSearch());

    // Start first search (don't await)
    act(() => {
      result.current.handleSearchChange('first');
    });

    // Start second search which should abort the first
    await act(async () => {
      await result.current.handleSearchChange('second');
    });

    // The second search's results should be displayed
    expect(result.current.convertedSearchData).toHaveLength(1);
    expect(result.current.convertedSearchData[0].title).toBe('second-result');

    // Clean up the first promise
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    resolveFirst!(secondResponse);
  });

  it('should load more results and append to existing data', async () => {
    const firstResponse = mockGlobalSearchResponse({
      results: [mockGlobalSearchResult({ name: 'result-1' })],
      pagination: mockGlobalSearchPagination({ totalCount: 2, hasNext: true }),
      errors: [],
    });

    const secondResponse = mockGlobalSearchResponse({
      results: [mockGlobalSearchResult({ name: 'result-2' })],
      pagination: mockGlobalSearchPagination({ totalCount: 2, hasNext: false }),
      errors: [],
    });

    mockSearch.mockResolvedValueOnce(firstResponse).mockResolvedValueOnce(secondResponse);

    const { result } = renderHook(() => useFeatureStoreSearch());

    await act(async () => {
      await result.current.handleSearchChange('test');
    });
    expect(result.current.convertedSearchData).toHaveLength(1);
    expect(result.current.hasMorePages).toBe(true);

    await act(async () => {
      await result.current.loadMoreResults();
    });
    expect(result.current.convertedSearchData).toHaveLength(2);
    expect(result.current.hasMorePages).toBe(false);
    expect(mockSearch).toHaveBeenCalledTimes(2);
    expect(mockSearch).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('should not load more when hasMorePages is false', async () => {
    const searchResponse = mockGlobalSearchResponse({
      results: [mockGlobalSearchResult({ name: 'only-result' })],
      pagination: mockGlobalSearchPagination({ totalCount: 1, hasNext: false }),
      errors: [],
    });

    mockSearch.mockResolvedValueOnce(searchResponse);

    const { result } = renderHook(() => useFeatureStoreSearch());

    await act(async () => {
      await result.current.handleSearchChange('test');
    });
    expect(result.current.hasMorePages).toBe(false);

    await act(async () => {
      await result.current.loadMoreResults();
    });

    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(result.current.convertedSearchData).toHaveLength(1);
  });

  it('should clean up abort controller on unmount', () => {
    const { unmount } = renderHook(() => useFeatureStoreSearch());

    // Should not throw when unmounting
    expect(() => unmount()).not.toThrow();
  });

  it('should not update state when search is aborted', async () => {
    const abortError = new Error('AbortError');
    abortError.name = 'AbortError';
    mockSearch.mockRejectedValue(abortError);

    const { result } = renderHook(() => useFeatureStoreSearch());

    await act(async () => {
      await result.current.handleSearchChange('test');
    });

    expect(result.current.convertedSearchData).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });

  it('should handle error during loadMoreResults', async () => {
    const firstResponse = mockGlobalSearchResponse({
      results: [mockGlobalSearchResult({ name: 'result-1' })],
      pagination: mockGlobalSearchPagination({ totalCount: 2, hasNext: true }),
      errors: [],
    });

    mockSearch.mockResolvedValueOnce(firstResponse).mockRejectedValueOnce(new Error('load error'));

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { result } = renderHook(() => useFeatureStoreSearch());

      await act(async () => {
        await result.current.handleSearchChange('test');
      });
      expect(result.current.hasMorePages).toBe(true);

      await act(async () => {
        await result.current.loadMoreResults();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Load more search results failed:',
        expect.any(Error),
      );
      expect(result.current.isLoadingMore).toBe(false);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('should abort in-flight request when clearSearch is called during active search', async () => {
    let resolveSearch: (value: unknown) => void;
    const searchPromise = new Promise((resolve) => {
      resolveSearch = resolve;
    });
    mockSearch.mockReturnValue(searchPromise);

    const { result } = renderHook(() => useFeatureStoreSearch());

    act(() => {
      result.current.handleSearchChange('test');
    });

    const firstCallArg = mockSearch.mock.calls[0]?.[0];
    expect(firstCallArg?.signal).toBeDefined();
    expect(firstCallArg.signal.aborted).toBe(false);

    act(() => {
      result.current.clearSearch();
    });

    expect(firstCallArg.signal.aborted).toBe(true);
    expect(result.current.isSearching).toBe(false);
    expect(result.current.convertedSearchData).toEqual([]);

    // Resolve the aborted promise and verify state remains cleared
    await act(async () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      resolveSearch!(
        mockGlobalSearchResponse({
          results: [],
          pagination: mockGlobalSearchPagination(),
          errors: [],
        }),
      );
      await Promise.resolve();
    });

    expect(result.current.convertedSearchData).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });

  it('should ignore stale AbortError when a newer search has replaced the controller', async () => {
    const abortError = new Error('AbortError');
    abortError.name = 'AbortError';

    let rejectFirst: (reason: unknown) => void;
    const firstPromise = new Promise((_resolve, reject) => {
      rejectFirst = reject;
    });

    const secondResponse = mockGlobalSearchResponse({
      results: [mockGlobalSearchResult({ name: 'second-result' })],
      pagination: mockGlobalSearchPagination({ totalCount: 1 }),
      errors: [],
    });

    mockSearch.mockReturnValueOnce(firstPromise).mockResolvedValueOnce(secondResponse);

    const { result } = renderHook(() => useFeatureStoreSearch());

    // Start first search (hangs on pending promise)
    act(() => {
      result.current.handleSearchChange('first');
    });

    // Start second search — replaces the abort controller ref
    await act(async () => {
      await result.current.handleSearchChange('second');
    });

    // Now reject the first search with AbortError; the controller has already been replaced
    await act(async () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      rejectFirst!(abortError);
      await Promise.resolve();
    });

    // Second search results remain intact — the stale AbortError was ignored
    expect(result.current.convertedSearchData).toHaveLength(1);
    expect(result.current.convertedSearchData[0].title).toBe('second-result');
    expect(result.current.isSearching).toBe(false);
    expect(result.current.searchErrors).toEqual([]);
  });

  it('should handle response with empty errors in handleSearchChange', async () => {
    const searchResponse = mockGlobalSearchResponse({
      results: [mockGlobalSearchResult({ name: 'result-1' })],
      pagination: mockGlobalSearchPagination({ totalCount: 1 }),
      errors: [],
    });

    mockSearch.mockResolvedValue(searchResponse);

    const { result } = renderHook(() => useFeatureStoreSearch());

    await act(async () => {
      await result.current.handleSearchChange('test');
    });

    expect(result.current.searchErrors).toEqual([]);
    expect(result.current.convertedSearchData).toHaveLength(1);
  });

  it('should handle response with empty errors in loadMoreResults', async () => {
    const firstResponse = mockGlobalSearchResponse({
      results: [mockGlobalSearchResult({ name: 'result-1' })],
      pagination: mockGlobalSearchPagination({ totalCount: 2, hasNext: true }),
      errors: [],
    });

    const secondResponse = mockGlobalSearchResponse({
      results: [mockGlobalSearchResult({ name: 'result-2' })],
      pagination: mockGlobalSearchPagination({ totalCount: 2, hasNext: false }),
      errors: [],
    });

    mockSearch.mockResolvedValueOnce(firstResponse).mockResolvedValueOnce(secondResponse);

    const { result } = renderHook(() => useFeatureStoreSearch());

    await act(async () => {
      await result.current.handleSearchChange('test');
    });
    expect(result.current.hasMorePages).toBe(true);

    await act(async () => {
      await result.current.loadMoreResults();
    });

    expect(result.current.convertedSearchData).toHaveLength(2);
    expect(result.current.searchErrors).toEqual([]);
    expect(result.current.isLoadingMore).toBe(false);
  });

  it('should cancel in-flight loadMore when clearSearch is called', async () => {
    const firstResponse = mockGlobalSearchResponse({
      results: [mockGlobalSearchResult({ name: 'result-1' })],
      pagination: mockGlobalSearchPagination({ totalCount: 2, hasNext: true }),
      errors: [],
    });

    let resolveLoadMore: (value: unknown) => void;
    const loadMorePromise = new Promise((resolve) => {
      resolveLoadMore = resolve;
    });

    mockSearch.mockResolvedValueOnce(firstResponse).mockReturnValueOnce(loadMorePromise);

    const { result } = renderHook(() => useFeatureStoreSearch());

    await act(async () => {
      await result.current.handleSearchChange('test');
    });
    expect(result.current.hasMorePages).toBe(true);

    // Start loadMore (don't await — it will hang on the pending promise)
    act(() => {
      result.current.loadMoreResults();
    });

    // loadMore should have received a signal
    const loadMoreCallArg = mockSearch.mock.calls[1]?.[0];
    expect(loadMoreCallArg?.signal).toBeDefined();
    expect(loadMoreCallArg.signal.aborted).toBe(false);

    // clearSearch should abort the loadMore controller
    act(() => {
      result.current.clearSearch();
    });

    expect(loadMoreCallArg.signal.aborted).toBe(true);
    expect(result.current.isLoadingMore).toBe(false);
    expect(result.current.convertedSearchData).toEqual([]);

    // Clean up the pending promise
    await act(async () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      resolveLoadMore!(
        mockGlobalSearchResponse({
          results: [],
          pagination: mockGlobalSearchPagination(),
          errors: [],
        }),
      );
      await Promise.resolve();
    });
  });

  it('should handle empty search response', async () => {
    mockSearch.mockResolvedValue(
      mockGlobalSearchResponse({
        results: [],
        pagination: mockGlobalSearchPagination({ totalCount: 0, hasNext: false }),
        errors: [],
      }),
    );

    const { result } = renderHook(() => useFeatureStoreSearch());

    await act(async () => {
      await result.current.handleSearchChange('test');
    });

    expect(result.current.convertedSearchData).toEqual([]);
    expect(result.current.hasMorePages).toBe(false);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.searchErrors).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });

  it('should handle loadMore response with empty results and no more pages', async () => {
    const firstResponse = mockGlobalSearchResponse({
      results: [mockGlobalSearchResult({ name: 'result-1' })],
      pagination: mockGlobalSearchPagination({ totalCount: 2, hasNext: true }),
      errors: [],
    });

    const secondResponse = mockGlobalSearchResponse({
      results: [],
      pagination: mockGlobalSearchPagination({ totalCount: 2, hasNext: false }),
      errors: [],
    });

    mockSearch.mockResolvedValueOnce(firstResponse).mockResolvedValueOnce(secondResponse);

    const { result } = renderHook(() => useFeatureStoreSearch());

    await act(async () => {
      await result.current.handleSearchChange('test');
    });
    expect(result.current.hasMorePages).toBe(true);

    await act(async () => {
      await result.current.loadMoreResults();
    });

    // First result should still be there, second page had no results
    expect(result.current.convertedSearchData).toHaveLength(1);
    expect(result.current.hasMorePages).toBe(false);
    expect(result.current.isLoadingMore).toBe(false);
  });

  it('should abort in-flight request on unmount when search is active', async () => {
    let resolveSearch: (value: unknown) => void;
    const searchPromise = new Promise((resolve) => {
      resolveSearch = resolve;
    });
    mockSearch.mockReturnValue(searchPromise);

    const { result, unmount } = renderHook(() => useFeatureStoreSearch());

    act(() => {
      result.current.handleSearchChange('test');
    });

    expect(() => unmount()).not.toThrow();
    const firstCallArg = mockSearch.mock.calls[0]?.[0];
    expect(firstCallArg?.signal).toBeDefined();
    expect(firstCallArg.signal.aborted).toBe(true);

    // Clean up the pending promise
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    resolveSearch!(
      mockGlobalSearchResponse({
        results: [],
        pagination: mockGlobalSearchPagination(),
        errors: [],
      }),
    );
  });
});

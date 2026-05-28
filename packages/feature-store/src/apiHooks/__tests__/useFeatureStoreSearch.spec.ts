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
});

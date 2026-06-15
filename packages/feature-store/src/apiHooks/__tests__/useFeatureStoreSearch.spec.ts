/* eslint-disable camelcase */
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  mockGlobalSearchResponse,
  mockGlobalSearchPagination,
  mockGlobalSearchResult,
} from '../../__mocks__/mockGlobalSearch';
import { mockFeatureStoreProject } from '../../__mocks__/mockFeatureStoreProject';
import { ProjectList } from '../../types/featureStoreProjects';
import { GlobalSearchResponse } from '../../types/search';
import { useFeatureStoreSearch } from '../useFeatureStoreSearch';

jest.mock('../useGlobalSearch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../useFeatureStoreProjects', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockUseGlobalSearch = jest.mocked(require('../useGlobalSearch').default);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockUseFeatureStoreProjects = jest.mocked(require('../useFeatureStoreProjects').default);

const mockSearch = jest.fn();

const mockProjectList: ProjectList = {
  projects: [mockFeatureStoreProject({ spec: { name: 'project-1' } })],
  pagination: {
    page: 1,
    limit: 10,
    total_count: 1,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  },
};

const emptyProjectList: ProjectList = {
  projects: [],
  pagination: {
    page: 0,
    limit: 0,
    total_count: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
  },
};

const makeProjectsState = (overrides?: Partial<{ projects: ProjectList; loaded: boolean }>) => ({
  data: overrides?.projects ?? mockProjectList,
  loaded: overrides?.loaded ?? true,
  error: undefined,
  refresh: jest.fn(),
});

describe('useFeatureStoreSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGlobalSearch.mockReturnValue({ search: mockSearch, apiAvailable: true });
    mockUseFeatureStoreProjects.mockReturnValue(makeProjectsState());
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useFeatureStoreSearch());

    expect(result.current.convertedSearchData).toEqual([]);
    expect(result.current.isSearching).toBe(false);
    expect(result.current.isLoadingMore).toBe(false);
    expect(result.current.hasMorePages).toBe(false);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.searchErrors).toEqual([]);
  });

  describe('handleSearchChange', () => {
    it('should reset state when query is empty', async () => {
      mockSearch.mockResolvedValueOnce(
        mockGlobalSearchResponse({
          results: [mockGlobalSearchResult({ name: 'user_id' })],
          pagination: mockGlobalSearchPagination({ totalCount: 1 }),
        }),
      );

      const { result } = renderHook(() => useFeatureStoreSearch());

      await act(async () => {
        await result.current.handleSearchChange('user');
      });
      expect(result.current.convertedSearchData).toHaveLength(1);

      await act(async () => {
        await result.current.handleSearchChange('');
      });

      expect(result.current.convertedSearchData).toEqual([]);
      expect(result.current.isSearching).toBe(false);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.searchErrors).toEqual([]);
    });

    it.each([
      [
        'API is unavailable',
        () => mockUseGlobalSearch.mockReturnValue({ search: mockSearch, apiAvailable: false }),
      ],
      [
        'no projects are available',
        () =>
          mockUseFeatureStoreProjects.mockReturnValue(
            makeProjectsState({ projects: emptyProjectList, loaded: true }),
          ),
      ],
    ])('should not fire search and clear isSearching when %s', async (_, setup) => {
      setup();
      const { result } = renderHook(() => useFeatureStoreSearch());

      await act(async () => {
        await result.current.handleSearchChange('user');
      });

      expect(mockSearch).not.toHaveBeenCalled();
      expect(result.current.isSearching).toBe(false);
    });

    it('should update results, pagination, and map result shape on successful search', async () => {
      mockSearch.mockResolvedValueOnce(
        mockGlobalSearchResponse({
          results: [
            mockGlobalSearchResult({
              name: 'user_id',
              type: 'entity',
              description: 'Unique user identifier',
              project: 'project-1',
              matched_tags: { team: 'platform' },
            }),
            mockGlobalSearchResult({ name: 'credit_score', type: 'feature' }),
          ],
          pagination: mockGlobalSearchPagination({ totalCount: 2, hasNext: true }),
        }),
      );

      const { result } = renderHook(() => useFeatureStoreSearch());

      await act(async () => {
        await result.current.handleSearchChange('user');
      });

      expect(result.current.convertedSearchData).toHaveLength(2);
      expect(result.current.isSearching).toBe(false);
      expect(result.current.totalCount).toBe(2);
      expect(result.current.hasMorePages).toBe(true);
      expect(result.current.searchErrors).toEqual([]);

      const first = result.current.convertedSearchData[0];
      expect(first.title).toBe('user_id');
      expect(first.description).toBe('Unique user identifier');
      expect(first.type).toBe('entity');
      expect(first.project).toBe('project-1');
      expect(first.matched_tags).toEqual({ team: 'platform' });
      expect(first.id).toContain('project-1-entity-user_id');

      expect(result.current.convertedSearchData[1].title).toBe('credit_score');
    });

    it('should surface API errors returned alongside results', async () => {
      mockSearch.mockResolvedValueOnce(
        mockGlobalSearchResponse({
          results: [],
          pagination: mockGlobalSearchPagination({ totalCount: 0 }),
          errors: ['Search service temporarily unavailable', 'Index rebuild in progress'],
        }),
      );

      const { result } = renderHook(() => useFeatureStoreSearch());

      await act(async () => {
        await result.current.handleSearchChange('user');
      });

      expect(result.current.searchErrors).toEqual([
        'Search service temporarily unavailable',
        'Index rebuild in progress',
      ]);
    });

    it('should discard results from a superseded search (race condition fix)', async () => {
      let resolveFirst!: (value: GlobalSearchResponse) => void;
      let resolveSecond!: (value: GlobalSearchResponse) => void;

      const firstPromise = new Promise<GlobalSearchResponse>((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise<GlobalSearchResponse>((resolve) => {
        resolveSecond = resolve;
      });

      mockSearch.mockReturnValueOnce(firstPromise).mockReturnValueOnce(secondPromise);

      const firstResponse = mockGlobalSearchResponse({
        results: [mockGlobalSearchResult({ name: 'stale_result' })],
        pagination: mockGlobalSearchPagination({ totalCount: 1 }),
      });
      const secondResponse = mockGlobalSearchResponse({
        results: [mockGlobalSearchResult({ name: 'fresh_result' })],
        pagination: mockGlobalSearchPagination({ totalCount: 1 }),
      });

      const { result } = renderHook(() => useFeatureStoreSearch());

      // Fire both searches without awaiting to simulate rapid consecutive keystrokes
      act(() => {
        void result.current.handleSearchChange('first');
      });
      act(() => {
        void result.current.handleSearchChange('second');
      });

      // Resolve the second (newer) search first
      await act(async () => {
        resolveSecond(secondResponse);
      });

      expect(result.current.convertedSearchData).toHaveLength(1);
      expect(result.current.convertedSearchData[0].title).toBe('fresh_result');
      expect(result.current.isSearching).toBe(false);

      // Now resolve the first (stale) search — its results must be discarded
      await act(async () => {
        resolveFirst(firstResponse);
      });

      expect(result.current.convertedSearchData).toHaveLength(1);
      expect(result.current.convertedSearchData[0].title).toBe('fresh_result');
    });

    it('should reset results on non-abort network error', async () => {
      mockSearch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useFeatureStoreSearch());

      await act(async () => {
        await result.current.handleSearchChange('user');
      });

      expect(result.current.convertedSearchData).toEqual([]);
      expect(result.current.isSearching).toBe(false);
      expect(result.current.hasMorePages).toBe(false);
    });

    it('should clear searchErrors when a new search starts', async () => {
      mockSearch.mockResolvedValueOnce(
        mockGlobalSearchResponse({ errors: ['Error from first search'] }),
      );
      const { result } = renderHook(() => useFeatureStoreSearch());

      await act(async () => {
        await result.current.handleSearchChange('first');
      });
      expect(result.current.searchErrors).toHaveLength(1);

      mockSearch.mockResolvedValueOnce(mockGlobalSearchResponse({ errors: [] }));

      await act(async () => {
        await result.current.handleSearchChange('second');
      });

      expect(result.current.searchErrors).toEqual([]);
    });
  });

  describe('clearSearch', () => {
    it('should reset all state to initial values', async () => {
      mockSearch.mockResolvedValueOnce(
        mockGlobalSearchResponse({
          results: [mockGlobalSearchResult({ name: 'user_id' })],
          pagination: mockGlobalSearchPagination({ totalCount: 1 }),
          errors: ['some error'],
        }),
      );

      const { result } = renderHook(() => useFeatureStoreSearch());

      await act(async () => {
        await result.current.handleSearchChange('user');
      });
      expect(result.current.convertedSearchData).toHaveLength(1);

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.convertedSearchData).toEqual([]);
      expect(result.current.isSearching).toBe(false);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.hasMorePages).toBe(false);
      expect(result.current.searchErrors).toEqual([]);
    });

    it('should abort an in-flight search request', async () => {
      let capturedSignal: AbortSignal | undefined;

      mockSearch.mockImplementation(({ signal }: { signal: AbortSignal }) => {
        capturedSignal = signal;
        return new Promise<GlobalSearchResponse>(() => {
          // intentionally never resolves — simulates a pending in-flight request
        });
      });

      const { result } = renderHook(() => useFeatureStoreSearch());

      act(() => {
        void result.current.handleSearchChange('user');
      });

      await waitFor(() => expect(capturedSignal).toBeDefined());

      act(() => {
        result.current.clearSearch();
      });

      expect(capturedSignal?.aborted).toBe(true);
      expect(result.current.isSearching).toBe(false);
    });
  });

  describe('loadMoreResults', () => {
    it('should append results and advance page on success', async () => {
      mockSearch.mockResolvedValueOnce(
        mockGlobalSearchResponse({
          results: [mockGlobalSearchResult({ name: 'page1_result' })],
          pagination: mockGlobalSearchPagination({ totalCount: 2, hasNext: true }),
        }),
      );

      const { result } = renderHook(() => useFeatureStoreSearch());

      await act(async () => {
        await result.current.handleSearchChange('user');
      });
      expect(result.current.hasMorePages).toBe(true);

      mockSearch.mockResolvedValueOnce(
        mockGlobalSearchResponse({
          results: [mockGlobalSearchResult({ name: 'page2_result' })],
          pagination: mockGlobalSearchPagination({ totalCount: 2, hasNext: false }),
        }),
      );

      await act(async () => {
        await result.current.loadMoreResults();
      });

      expect(result.current.convertedSearchData).toHaveLength(2);
      expect(result.current.convertedSearchData[1].title).toBe('page2_result');
      expect(result.current.hasMorePages).toBe(false);
      expect(result.current.isLoadingMore).toBe(false);
    });

    it('should not fetch when hasMorePages is false', async () => {
      const { result } = renderHook(() => useFeatureStoreSearch());

      await act(async () => {
        await result.current.loadMoreResults();
      });

      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('should not overwrite new search results when loadMore fires during the async gap', async () => {
      // Step 1: complete a pageable search so hasMorePages is true
      mockSearch.mockResolvedValueOnce(
        mockGlobalSearchResponse({
          results: [mockGlobalSearchResult({ name: 'page1_old' })],
          pagination: mockGlobalSearchPagination({ totalCount: 2, hasNext: true }),
        }),
      );

      const { result } = renderHook(() => useFeatureStoreSearch());

      await act(async () => {
        await result.current.handleSearchChange('old');
      });
      expect(result.current.hasMorePages).toBe(true);

      // Step 2: start a new search — keep it pending so hasMorePages is still true
      let resolveNewSearch!: (value: GlobalSearchResponse) => void;
      const newSearchPromise = new Promise<GlobalSearchResponse>((resolve) => {
        resolveNewSearch = resolve;
      });
      mockSearch.mockReturnValueOnce(newSearchPromise);

      act(() => {
        void result.current.handleSearchChange('new');
      });

      // hasMorePages is now false (reset at start of new search) so loadMore is a no-op
      expect(result.current.hasMorePages).toBe(false);

      // Step 3: attempt loadMoreResults — it must be blocked by hasMorePages = false
      await act(async () => {
        await result.current.loadMoreResults();
      });

      // Only 2 calls so far: old search + new search. loadMore must NOT have fired.
      expect(mockSearch).toHaveBeenCalledTimes(2);

      // Step 4: resolve the new search — results should land correctly
      const newResponse = mockGlobalSearchResponse({
        results: [mockGlobalSearchResult({ name: 'new_result' })],
        pagination: mockGlobalSearchPagination({ totalCount: 1, hasNext: false }),
      });

      await act(async () => {
        resolveNewSearch(newResponse);
      });

      expect(result.current.convertedSearchData).toHaveLength(1);
      expect(result.current.convertedSearchData[0].title).toBe('new_result');
      expect(result.current.isSearching).toBe(false);
    });
  });
});

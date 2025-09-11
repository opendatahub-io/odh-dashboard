import { useCallback, useMemo, useState, useEffect } from 'react';
import useFeatureStoreProjects from './useFeatureStoreProjects';
import useGlobalSearch from './useGlobalSearch';
import { GlobalSearchResponse } from '../types/search';
import { FEATURE_STORE_TYPE_TO_CATEGORY } from '../components/FeatureStoreGlobalSearch/const';

export const useFeatureStoreSearch = (): {
  convertedSearchData: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    type: string;
    project: string;
  }>;
  isSearching: boolean;
  isLoadingMore: boolean;
  hasMorePages: boolean;
  totalCount: number;
  handleSearchChange: (query: string) => Promise<void>;
  loadMoreResults: () => Promise<void>;
  clearSearch: () => void;
} => {
  const { data: featureStoreProjects, loaded: projectsLoaded } = useFeatureStoreProjects();
  const { search, apiAvailable } = useGlobalSearch();

  const hasAvailableProjects = projectsLoaded && featureStoreProjects.projects.length > 0;

  const [allResults, setAllResults] = useState<GlobalSearchResponse['results']>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [currentAbortController, setCurrentAbortController] = useState<AbortController | null>(
    null,
  );

  const convertedSearchData = useMemo(() => {
    if (allResults.length === 0) {
      return [];
    }

    if (!Array.isArray(allResults)) {
      return [];
    }

    const converted = allResults.map((result, index) => ({
      id: `${result.project}-${result.type}-${result.name}-${index}`,
      title: result.name,
      description: result.description,
      category: FEATURE_STORE_TYPE_TO_CATEGORY[result.type] || result.type,
      type: result.type,
      project: result.project,
    }));
    return converted;
  }, [allResults]);

  const handleSearchChange = useCallback(
    async (query: string) => {
      if (!query || !query.trim() || !apiAvailable) {
        setAllResults([]);
        setCurrentSearchQuery('');
        setCurrentPage(1);
        setHasMorePages(false);
        setTotalCount(0);
        return;
      }

      if (currentSearchQuery === query && isSearching) {
        return;
      }

      // Cancel any existing search request
      if (currentAbortController) {
        currentAbortController.abort();
      }

      // Create new AbortController for this search
      const abortController = new AbortController();
      setCurrentAbortController(abortController);

      setCurrentSearchQuery(query);
      setCurrentPage(1);
      setAllResults([]);
      setIsSearching(true);

      try {
        if (!hasAvailableProjects) {
          setIsSearching(false);
          setCurrentAbortController(null);
          return;
        }

        const projects = featureStoreProjects.projects.map((project) => project.spec.name);

        const results = await search({
          projects,
          query,
          page: 1,
          limit: 50,
          signal: abortController.signal,
        });

        setAllResults(results.results);
        setHasMorePages(results.pagination.hasNext);
        setTotalCount(results.pagination.totalCount);
        setCurrentAbortController(null);
      } catch (error) {
        // Don't update state if the request was aborted
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        setAllResults([]);
        setHasMorePages(false);
        setTotalCount(0);
        setCurrentAbortController(null);
      } finally {
        setIsSearching(false);
      }
    },
    [
      search,
      apiAvailable,
      hasAvailableProjects,
      currentSearchQuery,
      isSearching,
      currentAbortController,
    ],
  );

  const loadMoreResults = useCallback(async () => {
    if (!hasMorePages || isLoadingMore || !currentSearchQuery || !apiAvailable) {
      return;
    }

    setIsLoadingMore(true);
    try {
      if (!hasAvailableProjects) {
        setIsLoadingMore(false);
        return;
      }

      const projects = featureStoreProjects.projects.map((project) => project.spec.name);

      const nextPage = currentPage + 1;
      const results = await search({
        projects,
        query: currentSearchQuery,
        page: nextPage,
        limit: 50,
        signal: currentAbortController?.signal,
      });

      setAllResults((prevResults) => [...prevResults, ...results.results]);
      setCurrentPage(nextPage);
      setHasMorePages(results.pagination.hasNext);
    } catch (error) {
      // Don't log error if the request was aborted
      if (!(error instanceof Error && error.name === 'AbortError')) {
        console.error('Load more search results failed:', error);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    hasMorePages,
    isLoadingMore,
    currentSearchQuery,
    apiAvailable,
    hasAvailableProjects,
    currentPage,
    search,
  ]);

  const clearSearch = useCallback(() => {
    // Cancel any in-flight request
    if (currentAbortController) {
      currentAbortController.abort();
      setCurrentAbortController(null);
    }

    setAllResults([]);
    setIsSearching(false);
    setIsLoadingMore(false);
    setCurrentSearchQuery('');
    setCurrentPage(1);
    setHasMorePages(false);
    setTotalCount(0);
  }, [currentAbortController]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAbortController) {
        currentAbortController.abort();
      }
    };
  }, [currentAbortController]);

  return {
    convertedSearchData,
    isSearching,
    isLoadingMore,
    hasMorePages,
    totalCount,
    handleSearchChange,
    loadMoreResults,
    clearSearch,
  };
};

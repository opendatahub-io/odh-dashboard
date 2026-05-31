import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
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
    featureView?: string;
    matched_tags?: Record<string, string>;
  }>;
  isSearching: boolean;
  isLoadingMore: boolean;
  hasMorePages: boolean;
  totalCount: number;
  searchErrors: string[];
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
  const [searchErrors, setSearchErrors] = useState<string[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

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
      featureView: result.featureView,
      // eslint-disable-next-line camelcase
      matched_tags: result.matched_tags,
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
        setSearchErrors([]);
        return;
      }

      if (currentSearchQuery === query && isSearching) {
        return;
      }

      // Cancel any existing search request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this search
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setCurrentSearchQuery(query);
      setCurrentPage(1);
      setAllResults([]);
      setIsSearching(true);

      try {
        if (!hasAvailableProjects) {
          setIsSearching(false);
          abortControllerRef.current = null;
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

        const safeResults = results.results;
        const safeHasNext = results.pagination.hasNext;
        const safeTotalCount = results.pagination.totalCount;
        const safeErrors = results.errors;

        setAllResults(safeResults);
        setHasMorePages(safeHasNext);
        setTotalCount(safeTotalCount);
        setSearchErrors(safeErrors);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
        setIsSearching(false);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          if (abortControllerRef.current !== abortController) {
            return;
          }
          abortControllerRef.current = null;
          setIsSearching(false);
          return;
        }
        setAllResults([]);
        setHasMorePages(false);
        setTotalCount(0);
        setSearchErrors([]);
        abortControllerRef.current = null;
        setIsSearching(false);
      }
    },
    [
      search,
      apiAvailable,
      hasAvailableProjects,
      featureStoreProjects.projects,
      currentSearchQuery,
      isSearching,
    ],
  );

  const loadMoreResults = useCallback(async () => {
    if (!hasMorePages || isLoadingMore || !currentSearchQuery || !apiAvailable) {
      return;
    }

    const loadMoreController = new AbortController();
    abortControllerRef.current = loadMoreController;

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
        signal: loadMoreController.signal,
      });

      const safeNextResults = results.results;
      const safeHasNext = results.pagination.hasNext;
      setAllResults((prevResults) => [...prevResults, ...safeNextResults]);
      setCurrentPage(nextPage);
      setHasMorePages(safeHasNext);
      const nextErrors = results.errors;
      if (nextErrors.length > 0) {
        setSearchErrors((prev) => [...prev, ...nextErrors]);
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        console.error('Load more search results failed:', error);
      }
    } finally {
      if (abortControllerRef.current === loadMoreController) {
        abortControllerRef.current = null;
      }
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
    featureStoreProjects.projects,
  ]);

  const clearSearch = useCallback(() => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setAllResults([]);
    setIsSearching(false);
    setIsLoadingMore(false);
    setCurrentSearchQuery('');
    setCurrentPage(1);
    setHasMorePages(false);
    setTotalCount(0);
    setSearchErrors([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    convertedSearchData,
    isSearching,
    isLoadingMore,
    hasMorePages,
    totalCount,
    searchErrors,
    handleSearchChange,
    loadMoreResults,
    clearSearch,
  };
};

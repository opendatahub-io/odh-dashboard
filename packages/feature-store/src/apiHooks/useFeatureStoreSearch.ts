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

  // Use a ref so abort-controller identity is always current inside callbacks,
  // avoiding stale-closure race conditions that `useState` would introduce.
  const abortControllerRef = useRef<AbortController | null>(null);

  const convertedSearchData = useMemo(() => {
    if (allResults.length === 0 || !Array.isArray(allResults)) {
      return [];
    }

    return allResults.map((result, index) => ({
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
  }, [allResults]);

  const handleSearchChange = useCallback(
    async (query: string) => {
      if (!query || !query.trim() || !apiAvailable) {
        // Abort any in-flight request before resetting state
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        setAllResults([]);
        setCurrentSearchQuery('');
        setCurrentPage(1);
        setHasMorePages(false);
        setTotalCount(0);
        setSearchErrors([]);
        return;
      }

      // Cancel any existing search request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create a new controller for this search and capture it locally so
      // the finally/catch blocks can check identity before mutating state.
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setCurrentSearchQuery(query);
      setCurrentPage(1);
      setAllResults([]);
      setHasMorePages(false);
      setTotalCount(0);
      setIsSearching(true);
      setSearchErrors([]);

      try {
        if (!hasAvailableProjects) {
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
            setIsSearching(false);
          }
          return;
        }

        const projects = featureStoreProjects.projects.map((project) => project.spec.name);

        const results = await search({
          projects,
          query,
          page: 1,
          limit: 50,
          signal: controller.signal,
        });

        // Only update state if this controller is still the active one
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setAllResults(results.results);
          setHasMorePages(results.pagination.hasNext);
          setTotalCount(results.pagination.totalCount);
          if (results.errors.length > 0) {
            setSearchErrors(results.errors);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setAllResults([]);
          setHasMorePages(false);
          setTotalCount(0);
        }
      } finally {
        // The try/catch success paths null the ref when done; if it's still null
        // here we know no newer request has taken over and it's safe to clear loading.
        if (abortControllerRef.current === null) {
          setIsSearching(false);
        }
      }
    },
    [search, apiAvailable, hasAvailableProjects, featureStoreProjects.projects],
  );

  const loadMoreResults = useCallback(async () => {
    if (!hasMorePages || isLoadingMore || !currentSearchQuery || !apiAvailable) {
      return;
    }

    setIsLoadingMore(true);

    // Give load-more its own controller so clear/unmount can cancel it
    const loadMoreController = new AbortController();
    abortControllerRef.current = loadMoreController;

    try {
      if (!hasAvailableProjects) {
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

      if (abortControllerRef.current === loadMoreController) {
        abortControllerRef.current = null;
        setAllResults((prevResults) => [...prevResults, ...results.results]);
        setCurrentPage(nextPage);
        setHasMorePages(results.pagination.hasNext);
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
        abortControllerRef.current = null;
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

import { useCallback, useMemo, useState } from 'react';
import useFeatureStoreProjects from './useFeatureStoreProjects';
import useGlobalSearch from './useGlobalSearch';
import { GlobalSearchResponse } from '../types/search';
import { FEATURE_STORE_TYPE_TO_CATEGORY } from '../components/FeatureStoreGlobalSearch/const';

export const useFeatureStoreSearch = (): {
  convertedSearchData: Array<{
    id: number;
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
  const { data: featureStoreProjects } = useFeatureStoreProjects();
  const { search, apiAvailable } = useGlobalSearch();
  const [allResults, setAllResults] = useState<GlobalSearchResponse['results']>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const convertedSearchData = useMemo(() => {
    if (allResults.length === 0) {
      return [];
    }

    if (!Array.isArray(allResults)) {
      return [];
    }

    const converted = allResults.map((result, index) => ({
      id: index + 1,
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

      setCurrentSearchQuery(query);
      setCurrentPage(1);
      setAllResults([]);
      setIsSearching(true);

      try {
        const projects = featureStoreProjects.projects.map((project) => project.spec.name);

        if (projects.length === 0) {
          setIsSearching(false);
          return;
        }

        const results = await search({ projects, query, page: 1, limit: 50 });

        setAllResults(results.results);
        setHasMorePages(results.pagination.hasNext);
        setTotalCount(results.pagination.totalCount);
      } catch (error) {
        setAllResults([]);
        setHasMorePages(false);
        setTotalCount(0);
      } finally {
        setIsSearching(false);
      }
    },
    [search, apiAvailable, featureStoreProjects.projects, currentSearchQuery, isSearching],
  );

  const loadMoreResults = useCallback(async () => {
    if (!hasMorePages || isLoadingMore || !currentSearchQuery || !apiAvailable) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const projects = featureStoreProjects.projects.map((project) => project.spec.name);

      if (projects.length === 0) {
        setIsLoadingMore(false);
        return;
      }

      const nextPage = currentPage + 1;
      const results = await search({
        projects,
        query: currentSearchQuery,
        page: nextPage,
        limit: 50,
      });

      setAllResults((prevResults) => [...prevResults, ...results.results]);
      setCurrentPage(nextPage);
      setHasMorePages(results.pagination.hasNext);
    } catch (error) {
      console.error('Load more search results failed:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    hasMorePages,
    isLoadingMore,
    currentSearchQuery,
    apiAvailable,
    featureStoreProjects.projects,
    currentPage,
    search,
  ]);

  const clearSearch = useCallback(() => {
    setAllResults([]);
    setIsSearching(false);
    setIsLoadingMore(false);
    setCurrentSearchQuery('');
    setCurrentPage(1);
    setHasMorePages(false);
    setTotalCount(0);
  }, []);

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

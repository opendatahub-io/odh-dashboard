import React from 'react';
import { Collection } from '~/app/types';
import { COLLECTION_FETCH_LIMIT } from '~/app/utilities/const';
import { useCollectionsContext } from '~/app/context/CollectionsContext';
import { BenchmarkSortOption } from '~/app/pages/const';

const DEFAULT_PAGE_SIZE = 6;

export type UseCollectionsResult = {
  collections: Collection[];
  totalCount: number;
  loaded: boolean;
  loadError: Error | undefined;
  isTruncated: boolean;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  nameFilter: string;
  setNameFilter: (name: string) => void;
  categoryFilter: string[];
  setCategoryFilter: (category: string[]) => void;
  sortOption: BenchmarkSortOption;
  setSortOption: (sort: BenchmarkSortOption) => void;
  availableCategories: string[];
  refresh: () => void;
};

export const useCollections = (namespace: string): UseCollectionsResult => {
  const { response, loaded, loadError, refresh } = useCollectionsContext();

  const [page, setPageState] = React.useState(1);
  const [pageSize, setPageSizeState] = React.useState(DEFAULT_PAGE_SIZE);
  const [nameFilter, setNameFilterState] = React.useState('');
  const [categoryFilter, setCategoryFilterState] = React.useState<string[]>([]);
  const [sortOption, setSortOptionState] = React.useState(BenchmarkSortOption.DEFAULT);

  // True when the API returned more items than our fetch limit, meaning some
  // collections are not visible. The user should be informed so they can
  // contact an admin or refine their search via the server-side API directly.
  const isTruncated = Boolean(
    response.total_count && response.total_count > COLLECTION_FETCH_LIMIT,
  );

  // Derive available categories from the full unfiltered list.
  const availableCategories = React.useMemo(
    () =>
      [
        ...new Set(response.items.map((c) => c.category).filter((c): c is string => Boolean(c))),
      ].toSorted(),
    [response.items],
  );

  // Client-side filtering.
  const filteredCollections = React.useMemo(() => {
    let result = response.items;
    if (nameFilter) {
      result = result.filter((c) => c.name.toLowerCase().includes(nameFilter.toLowerCase()));
    }
    if (categoryFilter.length > 0) {
      result = result.filter((c) => categoryFilter.includes(c.category ?? ''));
    }
    return result;
  }, [response.items, nameFilter, categoryFilter]);

  // Client-side sorting.
  const sortedCollections = React.useMemo(() => {
    switch (sortOption) {
      case BenchmarkSortOption.NAME:
        return filteredCollections.toSorted((a, b) => a.name.localeCompare(b.name));
      case BenchmarkSortOption.CATEGORY:
        return filteredCollections.toSorted((a, b) => {
          const catCmp = (a.category ?? '').localeCompare(b.category ?? '');
          return catCmp !== 0 ? catCmp : a.name.localeCompare(b.name);
        });
      default:
        return filteredCollections;
    }
  }, [filteredCollections, sortOption]);

  // Client-side pagination.
  const paginatedCollections = React.useMemo(
    () => sortedCollections.slice((page - 1) * pageSize, page * pageSize),
    [sortedCollections, page, pageSize],
  );

  // Reset to page 1 when filters, sort, or namespace change.
  React.useEffect(() => {
    setPageState(1);
  }, [nameFilter, categoryFilter, sortOption, namespace]);

  const setPage = React.useCallback((newPage: number) => setPageState(newPage), []);

  const setPageSize = React.useCallback((newPageSize: number) => {
    setPageSizeState(newPageSize);
    setPageState(1);
  }, []);

  const setNameFilter = React.useCallback((name: string) => setNameFilterState(name), []);

  const setCategoryFilter = React.useCallback(
    (category: string[]) => setCategoryFilterState(category),
    [],
  );

  const setSortOption = React.useCallback(
    (sort: BenchmarkSortOption) => setSortOptionState(sort),
    [],
  );

  return {
    collections: paginatedCollections,
    totalCount: sortedCollections.length,
    loaded,
    loadError,
    isTruncated,
    page,
    pageSize,
    setPage,
    setPageSize,
    nameFilter,
    setNameFilter,
    categoryFilter,
    setCategoryFilter,
    sortOption,
    setSortOption,
    availableCategories,
    refresh,
  };
};

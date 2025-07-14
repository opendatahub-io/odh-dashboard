import * as React from 'react';
import { PipelineCoreResourceKF } from '#~/concepts/pipelines/kfTypes';
import {
  PipelineListPaged,
  PipelineOptions,
  PipelineRunOptions,
  PipelinesFilter,
} from '#~/concepts/pipelines/types';
import { FetchState } from '#~/utilities/useFetchState';

export type TableSortProps = {
  sortField?: string;
  setSortField: (field: string) => void;
  sortDirection?: 'asc' | 'desc';
  setSortDirection: (dir: 'asc' | 'desc') => void;
};

type TablePagingProps = {
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
};

type TableFilterProps = {
  filter?: PipelinesFilter;
  setFilter: (filter?: PipelinesFilter) => void;
};

export type TableProps = TableSortProps &
  TablePagingProps &
  TableFilterProps & {
    // false until data initially loads and then always returns true
    initialLoaded: boolean;
  };

export const getTableSortProps = (tableProps: Omit<TableProps, 'initialLoaded'>): TableSortProps =>
  (({ sortField, sortDirection, setSortField, setSortDirection }) => ({
    sortField,
    sortDirection,
    setSortField,
    setSortDirection,
  }))(tableProps);

export const getTablePagingProps = (
  tableProps: Omit<TableProps, 'initialLoaded'>,
): TablePagingProps =>
  (({ page, setPage, pageSize, setPageSize }) => ({
    page,
    setPage,
    pageSize,
    setPageSize,
  }))(tableProps);

export function useCreatePipelineRunTable<T extends PipelineCoreResourceKF>(
  fetchState: (options: PipelineRunOptions) => FetchState<PipelineListPaged<T>>,
  additionalOptions?: PipelineRunOptions,
  limit?: number,
): [FetchState<PipelineListPaged<T>>, TableProps] {
  return createUsePipelineTable<T>((options) => fetchState({ ...options, ...additionalOptions }))(
    limit,
  );
}

const createUsePipelineTable =
  <T extends PipelineCoreResourceKF>(
    useState: (options: PipelineOptions | PipelineRunOptions) => FetchState<PipelineListPaged<T>>,
  ) =>
  // providing a limit overrides pageSize and prevents paging
  (limit?: number): [FetchState<PipelineListPaged<T>>, TableProps] => {
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(limit || 10);
    const [sortField, setSortField] = React.useState<string>();
    const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>();
    const [filter, setFilter] = React.useState<PipelinesFilter | undefined>();
    const [initialLoaded, setInitialLoaded] = React.useState(false);

    const state = useState({
      page,
      pageSize,
      sortField,
      sortDirection,
      filter,
    });

    const loaded = state[1];
    // Track the first load so that the full page spinner is first shown.
    React.useEffect(() => {
      if (loaded) {
        setInitialLoaded(true);
      }
    }, [loaded]);

    const setLimitedPage = React.useCallback<typeof setPage>(
      (currentPage) => {
        if (!limit) {
          setPage(currentPage);
        }
      },
      [limit],
    );

    const setPageSizeAndReset = React.useCallback<typeof setPageSize>(
      (currentPageSize) => {
        if (!limit) {
          setPageSize(currentPageSize);
          setPage(1);
        }
      },
      [limit],
    );

    const setSortFieldAndReset = React.useCallback<typeof setSortField>((currentSortField) => {
      // when sort field changes, move back to first page
      setSortField(currentSortField);
      setPage(1);
    }, []);

    const setSortDirectionAndReset = React.useCallback<typeof setSortDirection>(
      (currentSortDirection) => {
        // when sort direction changes, move back to first page
        setSortDirection(currentSortDirection);
        setPage(1);
      },
      [],
    );

    const setFilterAndReset = React.useCallback<typeof setFilter>((currentFilter) => {
      // when filter changes, move back to first page
      setFilter(currentFilter);
      setPage(1);
    }, []);

    return [
      state,
      {
        page,
        setPage: setLimitedPage,
        pageSize,
        setPageSize: setPageSizeAndReset,
        sortField,
        setSortField: setSortFieldAndReset,
        sortDirection,
        setSortDirection: setSortDirectionAndReset,
        filter,
        setFilter: setFilterAndReset,
        initialLoaded,
      },
    ];
  };

export default createUsePipelineTable;

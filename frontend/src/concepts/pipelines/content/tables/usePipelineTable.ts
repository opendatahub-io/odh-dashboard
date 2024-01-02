import * as React from 'react';
import { PipelineCoreResourceKF } from '~/concepts/pipelines/kfTypes';
import { PipelineListPaged, PipelineOptions, PipelinesFilter } from '~/concepts/pipelines/types';
import { FetchState } from '~/utilities/useFetchState';

export type TableProps = {
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  sortField?: string;
  setSortField: (field: string) => void;
  sortDirection?: 'asc' | 'desc';
  setSortDirection: (dir: 'asc' | 'desc') => void;
  filter?: PipelinesFilter;
  setFilter: (filter?: PipelinesFilter) => void;

  // false until data initially loads and then always returns true
  initialLoaded: boolean;
};

const createUsePipelineTable =
  <T extends PipelineCoreResourceKF>(
    useState: (options: PipelineOptions) => FetchState<PipelineListPaged<T>>,
  ) =>
  // providing a limit overrides pageSize and prevents paging
  (limit?: number): [FetchState<PipelineListPaged<T>>, TableProps] => {
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(limit || 10);
    const [sortField, setSortField] = React.useState<string>();
    const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>();
    const [filter, setFilter] = React.useState<PipelinesFilter | undefined>();
    const [initialLoaded, setInitialLoaded] = React.useState(false);

    const state = useState({ page, pageSize, sortField, sortDirection, filter });

    const loaded = state[1];
    // Track the first load so that the full page spinner is first shown.
    React.useEffect(() => {
      if (loaded) {
        setInitialLoaded(true);
      }
    }, [loaded]);

    const setLimitedPage = React.useCallback<typeof setPage>(
      (page) => {
        if (!limit) {
          setPage(page);
        }
      },
      [limit],
    );

    const setPageSizeAndReset = React.useCallback<typeof setPageSize>(
      (pageSize) => {
        if (!limit) {
          setPageSize(pageSize);
          setPage(1);
        }
      },
      [limit],
    );

    const setSortFieldAndReset = React.useCallback<typeof setSortField>((sortField) => {
      // when sort field changes, move back to first page
      setSortField(sortField);
      setPage(1);
    }, []);

    const setSortDirectionAndReset = React.useCallback<typeof setSortDirection>((sortDirection) => {
      // when sort direction changes, move back to first page
      setSortDirection(sortDirection);
      setPage(1);
    }, []);

    const setFilterAndReset = React.useCallback<typeof setFilter>((filter) => {
      // when filter changes, move back to first page
      setFilter(filter);
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

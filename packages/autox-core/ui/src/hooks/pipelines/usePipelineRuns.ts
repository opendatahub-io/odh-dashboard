/* eslint-disable camelcase -- PipelineRunsData uses snake_case to match BFF API */
import { useFetchState, FetchStateCallbackPromise } from 'mod-arch-core';
import React from 'react';
import { DEFAULT_PAGE_SIZE, type PipelineRun } from '../../api/pipelines';
import { useAutoXApi } from '../../context';

export type PipelineRunsResult<TParams = Record<string, unknown>> = {
  runs: PipelineRun<TParams>[];
  totalSize: number;
  nextPageToken: string;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
};

/**
 * Fetches paginated pipeline runs using the injected API client.
 */
export function usePipelineRuns<TParams = Record<string, unknown>>(
  namespace: string,
  pollInterval = 30000,
): PipelineRunsResult<TParams> {
  const { pipelines: pipelinesApi } = useAutoXApi();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);

  const fetchCallback = React.useCallback<
    FetchStateCallbackPromise<{
      runs: PipelineRun<TParams>[];
      total_size: number;
      next_page_token: string;
    }>
  >(async () => {
    if (!namespace) {
      return { runs: [], total_size: 0, next_page_token: '' };
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const result = (await pipelinesApi.getPipelineRunsFromBFF('', {
      namespace,
      pageSize,
      page,
    })) as {
      runs: PipelineRun<TParams>[];
      total_size: number;
      next_page_token: string;
    };
    return result;
  }, [pipelinesApi, namespace, page, pageSize]);

  const [data, loaded, error, refresh] = useFetchState<{
    runs: PipelineRun<TParams>[];
    total_size: number;
    next_page_token: string;
  }>(
    fetchCallback,
    { runs: [], total_size: 0, next_page_token: '' },
    { refreshRate: pollInterval },
  );

  // Reset to page 1 when namespace or pageSize changes
  React.useEffect(() => {
    setPage(1);
  }, [namespace, pageSize]);

  const setPageWrapped = React.useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const setPageSizeWrapped = React.useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  const refreshWrapped = React.useCallback(async () => {
    if (page === 1) {
      await refresh();
    } else {
      setPage(1);
    }
  }, [page, refresh]);

  return {
    runs: data.runs,
    totalSize: data.total_size,
    nextPageToken: data.next_page_token,
    page,
    pageSize,
    setPage: setPageWrapped,
    setPageSize: setPageSizeWrapped,
    loaded,
    error: error ?? undefined,
    refresh: refreshWrapped,
  };
}

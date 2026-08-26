/* eslint-disable camelcase -- PipelineRunsData uses snake_case to match BFF API */
import { useFetchState, FetchStateCallbackPromise } from 'mod-arch-core';
import React from 'react';
import type { PipelineRun, PipelinesApi } from '../../api/pipelines';

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
 * Creates a `usePipelineRuns` hook bound to a product's own pipelines API (as returned by
 * `createPipelinesApi`).
 *
 * @param getPipelineRunsFromBFF - The product's `getPipelineRunsFromBFF` API function.
 * @param defaultPageSize - Initial page size (defaults to 20, matching `createPipelinesApi`'s own default).
 * @param pollInterval - Poll interval in ms for background refresh (defaults to 30000).
 */
export function createUsePipelineRuns<TParams = Record<string, unknown>>(
  getPipelineRunsFromBFF: PipelinesApi<TParams>['getPipelineRunsFromBFF'],
  defaultPageSize = 20,
  pollInterval = 30000,
) {
  /**
   * Fetches and manages paginated pipeline runs from the BFF for a given namespace.
   * Polls at `pollInterval` for updates.
   *
   * @param namespace - The Kubernetes namespace to fetch runs from. Returns empty when empty.
   * @returns Paginated runs, loading/error state, page controls, and refresh callback.
   */
  return function usePipelineRuns(namespace: string): PipelineRunsResult<TParams> {
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(defaultPageSize);

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
      const result = await getPipelineRunsFromBFF('', {
        namespace,
        pageSize,
        page,
      });
      return result;
    }, [namespace, page, pageSize]);

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
  };
}

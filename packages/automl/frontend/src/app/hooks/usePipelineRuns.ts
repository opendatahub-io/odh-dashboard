/* eslint-disable camelcase -- PipelineRunsData uses snake_case to match BFF API */
import { useFetchState, FetchStateCallbackPromise } from 'mod-arch-core';
import React from 'react';
import { getPipelineRunsFromBFF } from '~/app/api/pipelines';
import type { PipelineRun } from '~/app/types';
import { DEFAULT_PAGE_SIZE, POLL_INTERVAL } from '~/app/utilities/const';

export type PipelineRunsResult = {
  runs: PipelineRun[];
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
 * Fetches and manages paginated pipeline runs from the AutoML BFF for a given namespace.
 * Polls at {@link POLL_INTERVAL} for updates.
 *
 * @param namespace - The Kubernetes namespace to fetch runs from. Returns empty when empty.
 * @returns Paginated runs, loading/error state, page controls, and refresh callback.
 */
export function usePipelineRuns(namespace: string): PipelineRunsResult {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const pageTokensRef = React.useRef<(string | undefined)[]>([]);

  const fetchCallback = React.useCallback<
    FetchStateCallbackPromise<{ runs: PipelineRun[]; total_size: number; next_page_token: string }>
  >(async () => {
    if (!namespace) {
      return { runs: [], total_size: 0, next_page_token: '' };
    }
    if (page > 1 && !pageTokensRef.current[page - 1]) {
      throw new Error(`No token available for page ${page}.`);
    }
    const result = await getPipelineRunsFromBFF('', {
      namespace,
      pageSize,
      nextPageToken: pageTokensRef.current[page - 1],
    });
    return result;
  }, [namespace, page, pageSize]);

  const [data, loaded, error, refresh] = useFetchState<{
    runs: PipelineRun[];
    total_size: number;
    next_page_token: string;
  }>(
    fetchCallback,
    { runs: [], total_size: 0, next_page_token: '' },
    { refreshRate: POLL_INTERVAL },
  );

  // Store nextPageToken for the current page so we can fetch page+1
  React.useEffect(() => {
    if (loaded && pageTokensRef.current[page] !== data.next_page_token) {
      const newTokens = pageTokensRef.current.slice(0, page);
      newTokens[page] = data.next_page_token;
      pageTokensRef.current = newTokens;
    }
  }, [loaded, page, data.next_page_token]);

  // Reset to page 1 when namespace or pageSize changes
  React.useEffect(() => {
    setPage(1);
    pageTokensRef.current = [];
  }, [namespace, pageSize]);

  const setPageWrapped = React.useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const setPageSizeWrapped = React.useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
    pageTokensRef.current = [];
  }, []);

  const refreshWrapped = React.useCallback(async () => {
    pageTokensRef.current = [];
    setPage(1);
    await refresh();
  }, [refresh]);

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

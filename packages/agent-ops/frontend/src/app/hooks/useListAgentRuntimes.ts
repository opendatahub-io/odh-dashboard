import React from 'react';
import { useFetchState, type FetchStateCallbackPromise } from 'mod-arch-core';
import { listAgentRuntimes } from '~/app/api/agentRuntimes';
import { NO_REFRESH_INTERVAL, AGENT_RUNTIMES_REFRESH_INTERVAL } from '~/app/const';
import { AgentRuntime } from '~/app/types/agentRuntimes';

const DEFAULT_PAGE_SIZE = 10;

export type ListAgentRuntimesResult = {
  runtimes: AgentRuntime[];
  continueToken?: string;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
};

/**
 * Fetches agent runtimes for the deployments list with BFF cursor pagination.
 * Polls every `refreshInterval` ms (default 10 s) when a namespace is selected;
 */
export const useListAgentRuntimes = (
  namespace?: string,
  refreshInterval = AGENT_RUNTIMES_REFRESH_INTERVAL,
): ListAgentRuntimesResult => {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const pageTokensRef = React.useRef<(string | undefined)[]>([]);

  const fetchCallback = React.useCallback<
    FetchStateCallbackPromise<{ runtimes: AgentRuntime[]; continueToken?: string }>
  >(
    async (opts) => {
      if (page > 1 && !pageTokensRef.current[page - 1]) {
        throw new Error(`No token available for page ${page}.`);
      }
      return listAgentRuntimes('')(opts, {
        limit: pageSize,
        continueToken: pageTokensRef.current[page - 1],
      });
    },
    [page, pageSize],
  );

  const [data, loaded, error, refresh] = useFetchState<{
    runtimes: AgentRuntime[];
    continueToken?: string;
  }>(
    fetchCallback,
    { runtimes: [] },
    {
      refreshRate: namespace ? refreshInterval : NO_REFRESH_INTERVAL,
    },
  );

  React.useEffect(() => {
    if (loaded && pageTokensRef.current[page] !== data.continueToken) {
      const newTokens = pageTokensRef.current.slice(0, page);
      newTokens[page] = data.continueToken;
      pageTokensRef.current = newTokens;
    }
  }, [loaded, page, data.continueToken]);

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

  const runtimes = React.useMemo(
    () =>
      namespace
        ? data.runtimes.filter((runtime) => runtime.namespace === namespace)
        : data.runtimes,
    [data.runtimes, namespace],
  );

  return {
    runtimes,
    continueToken: data.continueToken,
    page,
    pageSize,
    setPage: setPageWrapped,
    setPageSize: setPageSizeWrapped,
    loaded,
    error: error ?? undefined,
    refresh: refreshWrapped,
  };
};

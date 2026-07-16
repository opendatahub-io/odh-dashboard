import * as React from 'react';
import { FetchStateCallbackPromise, useFetchState } from 'mod-arch-core';
import { Agent, AgentList, AgentListParams } from '~/app/agentsCatalogTypes';
import { AgentsCatalogContext } from '~/app/context/agentsCatalog/AgentsCatalogContext';
import type { ModelCatalogAPIState } from '~/app/hooks/modelCatalog/useModelCatalogAPIState';

type PaginatedAgentList = {
  items: Agent[];
  size: number;
  pageSize: number;
  nextPageToken: string;
  loadMore: () => void;
  isLoadingMore: boolean;
  hasMore: boolean;
  refresh: () => void;
  loadMoreError?: Error;
};

export type AgentsResult = {
  agents: PaginatedAgentList;
  agentsLoaded: boolean;
  agentsLoadError: Error | undefined;
  refresh: () => void;
};

type UseAgentsBySourceLabelParams = {
  sourceLabel?: string;
  pageSize?: number;
  searchQuery?: string;
  filterQuery?: string;
  namedQuery?: string;
  sortBy?: string | null;
  sortOrder?: string;
};

export function useAgentsBySourceLabelWithAPI(
  apiState: ModelCatalogAPIState,
  params: UseAgentsBySourceLabelParams,
): AgentsResult {
  const {
    sourceLabel,
    pageSize = 10,
    searchQuery = '',
    filterQuery,
    namedQuery,
    sortBy,
    sortOrder,
  } = params;
  const { api, apiAvailable } = apiState;

  const [allItems, setAllItems] = React.useState<Agent[]>([]);
  const [totalSize, setTotalSize] = React.useState(0);
  const [nextPageTokenValue, setNextPageTokenValue] = React.useState('');
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const isLoadingMoreRef = React.useRef(false);
  const [loadMoreError, setLoadMoreError] = React.useState<Error | undefined>();

  const buildAgentListParams = React.useCallback(
    (nextPageToken?: string): AgentListParams => ({
      sourceLabel,
      pageSize,
      ...(nextPageToken !== undefined && nextPageToken !== '' && { nextPageToken }),
      q: searchQuery.trim() || undefined,
      filterQuery,
      namedQuery,
      orderBy: sortBy ?? undefined,
      sortOrder,
    }),
    [sourceLabel, pageSize, searchQuery, filterQuery, namedQuery, sortBy, sortOrder],
  );

  const fetchAgents = React.useCallback<FetchStateCallbackPromise<AgentList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }
      return api.getAgentList(opts, buildAgentListParams());
    },
    [api, apiAvailable, buildAgentListParams],
  );

  const [firstPageData, loaded, error, refetch] = useFetchState(
    fetchAgents,
    { items: [], size: 0, pageSize: 10, nextPageToken: '' },
    { initialPromisePurity: true },
  );

  React.useEffect(() => {
    if (loaded && !error) {
      setAllItems(firstPageData.items ?? []);
      setTotalSize(firstPageData.size);
      setNextPageTokenValue(firstPageData.nextPageToken);
    }
  }, [firstPageData, loaded, error]);

  const loadMore = React.useCallback(async () => {
    if (!nextPageTokenValue || !apiAvailable) {
      return;
    }
    if (isLoadingMoreRef.current) {
      return;
    }
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(undefined);

    try {
      const response = await api.getAgentList({}, buildAgentListParams(nextPageTokenValue));

      setAllItems((prev) => [...prev, ...(response.items ?? [])]);
      setTotalSize(response.size);
      setNextPageTokenValue(response.nextPageToken);
      setLoadMoreError(undefined);
    } catch (err) {
      setLoadMoreError(
        new Error(
          `Failed to load more agents: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [api, apiAvailable, buildAgentListParams, nextPageTokenValue]);

  React.useEffect(() => {
    setAllItems([]);
    setTotalSize(0);
    setNextPageTokenValue('');
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
    setLoadMoreError(undefined);
  }, [sourceLabel, pageSize, searchQuery, filterQuery, namedQuery, sortBy, sortOrder]);

  const refresh = React.useCallback(() => {
    setAllItems([]);
    setTotalSize(0);
    setNextPageTokenValue('');
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
    setLoadMoreError(undefined);
    refetch();
  }, [refetch]);

  const paginatedData: PaginatedAgentList = React.useMemo(
    () => ({
      items: allItems,
      size: totalSize,
      pageSize: firstPageData.pageSize,
      nextPageToken: nextPageTokenValue,
      loadMore,
      isLoadingMore,
      hasMore: Boolean(nextPageTokenValue),
      refresh,
      loadMoreError,
    }),
    [
      allItems,
      totalSize,
      firstPageData.pageSize,
      nextPageTokenValue,
      loadMore,
      isLoadingMore,
      refresh,
      loadMoreError,
    ],
  );

  return {
    agents: paginatedData,
    agentsLoaded: loaded,
    agentsLoadError: error,
    refresh,
  };
}

export const useAgentsBySourceLabel = (
  sourceLabel?: string,
  pageSize = 10,
  searchQuery = '',
  filterQuery?: string,
  namedQuery?: string,
  sortBy?: string | null,
  sortOrder?: string,
): AgentsResult => {
  const { agentApiState } = React.useContext(AgentsCatalogContext);
  return useAgentsBySourceLabelWithAPI(agentApiState, {
    sourceLabel,
    pageSize,
    searchQuery,
    filterQuery,
    namedQuery,
    sortBy,
    sortOrder,
  });
};

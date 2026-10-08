import React from 'react';
import {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
  useFetchState,
  useDeepCompareMemoize,
} from 'mod-arch-core';
import {
  ServingRuntimeList,
  ServingRuntimeListParams,
} from '~/odh/types/servingRuntimeCatalogTypes';
import { useServingRuntimeCatalogAPI } from '~/odh/hooks/servingRuntimeCatalog/useServingRuntimeCatalogAPI';

type PaginatedServingRuntimeList = ServingRuntimeList & {
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreError?: Error;
};

export const useServingRuntimeList = (
  params: ServingRuntimeListParams = {},
): FetchState<PaginatedServingRuntimeList> => {
  const { api, apiAvailable } = useServingRuntimeCatalogAPI();
  const stableParams = useDeepCompareMemoize(params);
  const [pages, setPages] = React.useState<ServingRuntimeList>();
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [loadMoreError, setLoadMoreError] = React.useState<Error>();
  const isLoadingMoreRef = React.useRef(false);
  const generation = React.useRef(0);
  const call = React.useCallback<FetchStateCallbackPromise<ServingRuntimeList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('Serving runtime catalog API not yet available'));
      }
      return api.getServingRuntimeList(opts, stableParams);
    },
    [api, apiAvailable, stableParams],
  );
  const [firstPage, loaded, error, refetch] = useFetchState(
    call,
    { items: [], size: 0, pageSize: 0, nextPageToken: '' },
    { initialPromisePurity: true },
  );

  React.useEffect(() => {
    generation.current += 1;
    setPages(undefined);
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
    setLoadMoreError(undefined);
    return () => {
      generation.current += 1;
    };
  }, [call]);

  React.useEffect(() => {
    if (loaded && !error) {
      setPages(firstPage);
    }
  }, [firstPage, loaded, error]);

  const nextPageToken = pages?.nextPageToken ?? '';
  const loadMore = React.useCallback(async () => {
    if (!nextPageToken || !loaded || !apiAvailable || isLoadingMoreRef.current) {
      return;
    }
    const requestGeneration = generation.current;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(undefined);
    try {
      const response = await api.getServingRuntimeList(
        {},
        {
          ...stableParams,
          nextPageToken,
        },
      );
      if (requestGeneration === generation.current) {
        setPages((previous) => ({
          ...response,
          items: [...(previous?.items ?? []), ...response.items],
        }));
      }
    } catch (err) {
      if (requestGeneration === generation.current) {
        setLoadMoreError(
          new Error(
            `Failed to load more runtime images: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
      }
    } finally {
      if (requestGeneration === generation.current) {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [api, apiAvailable, loaded, nextPageToken, stableParams]);

  const refresh = React.useCallback(async () => {
    generation.current += 1;
    setPages(undefined);
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
    setLoadMoreError(undefined);
    const response = await refetch();
    return response
      ? { ...response, loadMore, hasMore: Boolean(response.nextPageToken), isLoadingMore: false }
      : undefined;
  }, [refetch, loadMore]);

  const data = React.useMemo(
    () => ({
      ...(pages ?? firstPage),
      loadMore,
      hasMore: Boolean(nextPageToken),
      isLoadingMore,
      loadMoreError,
    }),
    [pages, firstPage, loadMore, nextPageToken, isLoadingMore, loadMoreError],
  );
  return [data, loaded, error, refresh];
};

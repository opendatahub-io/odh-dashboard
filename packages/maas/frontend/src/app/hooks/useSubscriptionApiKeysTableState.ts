import React from 'react';
import { APIKeyListResponse, APIKeySearchRequest } from '~/app/types/api-key';
import { useFetchApiKeys } from './useFetchApiKeys';

const DEFAULT_PER_PAGE = 5;

type UseSubscriptionApiKeysTableStateReturn = {
  response: APIKeyListResponse;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => void;
  page: number;
  perPage: number;
  isFetching: boolean;
  onSetPage: (newPage: number) => void;
  onPerPageSelect: (newPerPage: number, newPage: number) => void;
};

export const useSubscriptionApiKeysTableState = (
  subscriptionId: string,
): UseSubscriptionApiKeysTableStateReturn => {
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(DEFAULT_PER_PAGE);
  const [isFetching, setIsFetching] = React.useState(false);

  const searchRequest: APIKeySearchRequest = React.useMemo(
    () => ({
      filters: { subscription: subscriptionId, status: ['active', 'expired'] },
      pagination: { limit: perPage, offset: (page - 1) * perPage },
    }),
    [subscriptionId, page, perPage],
  );

  const [response, loaded, error, refresh] = useFetchApiKeys(
    subscriptionId ? searchRequest : { pagination: { limit: 0, offset: 0 } },
  );

  React.useEffect(() => {
    setPage(1);
    setIsFetching(false);
  }, [subscriptionId]);

  React.useEffect(() => {
    setIsFetching(false);
  }, [response]);

  const onSetPage = React.useCallback((newPage: number) => {
    setPage(Math.max(1, newPage));
    setIsFetching(true);
  }, []);

  const onPerPageSelect = React.useCallback((newPerPage: number, newPage: number) => {
    setPerPage(newPerPage);
    setPage(Math.max(1, newPage));
    setIsFetching(true);
  }, []);

  return {
    response,
    loaded,
    error,
    refresh,
    page,
    perPage,
    isFetching,
    onSetPage,
    onPerPageSelect,
  };
};

import React from 'react';
import { APIKeyListResponse, APIKeySearchRequest } from '~/app/types/api-key';
import { ApiKeySortField } from '~/app/pages/keys-and-subs/apiKeys/allKeys/columns';
import { useFetchApiKeys } from './useFetchApiKeys';

type SortDirection = 'asc' | 'desc';

const DEFAULT_PER_PAGE = 5;
const DEFAULT_SORT_FIELD: ApiKeySortField = 'created_at';
const DEFAULT_SORT_DIRECTION: SortDirection = 'desc';

type UseSubscriptionApiKeysTableStateReturn = {
  response: APIKeyListResponse;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => void;
  page: number;
  perPage: number;
  sortField: ApiKeySortField;
  sortDirection: SortDirection;
  isFetching: boolean;
  onSetPage: (newPage: number) => void;
  onPerPageSelect: (newPerPage: number, newPage: number) => void;
  onSort: (field: ApiKeySortField, direction: SortDirection) => void;
};

export const useSubscriptionApiKeysTableState = (
  subscriptionId: string,
): UseSubscriptionApiKeysTableStateReturn => {
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(DEFAULT_PER_PAGE);
  const [sortField, setSortField] = React.useState<ApiKeySortField>(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(DEFAULT_SORT_DIRECTION);
  const [isFetching, setIsFetching] = React.useState(false);

  const searchRequest: APIKeySearchRequest = React.useMemo(
    () => ({
      filters: { subscription: subscriptionId, status: ['active', 'expired'] },
      sort: { by: sortField, order: sortDirection },
      pagination: { limit: perPage, offset: (page - 1) * perPage },
    }),
    [subscriptionId, sortField, sortDirection, page, perPage],
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

  const onSort = React.useCallback((field: ApiKeySortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    setPage(1);
    setIsFetching(true);
  }, []);

  return {
    response,
    loaded,
    error,
    refresh,
    page,
    perPage,
    sortField,
    sortDirection,
    isFetching,
    onSetPage,
    onPerPageSelect,
    onSort,
  };
};

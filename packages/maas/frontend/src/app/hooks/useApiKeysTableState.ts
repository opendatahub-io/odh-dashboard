import React from 'react';
import {
  APIKeyStatus,
  APIKeySearchRequest,
  ApiKeyFilterDataType,
  initialApiKeyFilterData,
  emptyApiKeyFilterData,
  APIKeyListResponse,
} from '~/app/types/api-key';
import { ApiKeySortField } from '~/app/pages/api-keys/allKeys/columns';
import { useFetchApiKeys } from './useFetchApiKeys';

type SortDirection = 'asc' | 'desc';

const DEFAULT_SORT_FIELD: ApiKeySortField = 'created_at';
const DEFAULT_SORT_DIRECTION: SortDirection = 'desc';
const DEFAULT_PER_PAGE = 50;

export type UseApiKeysTableStateReturn = {
  response: APIKeyListResponse;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => void;
  filterData: ApiKeyFilterDataType;
  localUsername: string;
  setLocalUsername: React.Dispatch<React.SetStateAction<string>>;
  page: number;
  perPage: number;
  sortField: ApiKeySortField;
  sortDirection: SortDirection;
  isFetching: boolean;
  onUsernameChange: (value: string) => void;
  onStatusToggle: (status: APIKeyStatus) => void;
  onStatusClear: (status: APIKeyStatus) => void;
  onSort: (field: ApiKeySortField, direction: SortDirection) => void;
  onSetPage: (newPage: number) => void;
  onPerPageSelect: (newPerPage: number, newPage: number) => void;
  onClearFilters: () => void;
};

export const useApiKeysTableState = (): UseApiKeysTableStateReturn => {
  const [filterData, setFilterData] = React.useState<ApiKeyFilterDataType>(initialApiKeyFilterData);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(DEFAULT_PER_PAGE);
  const [sortField, setSortField] = React.useState<ApiKeySortField>(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(DEFAULT_SORT_DIRECTION);
  const [localUsername, setLocalUsername] = React.useState('');
  const [isFetching, setIsFetching] = React.useState(false);

  const searchRequest: APIKeySearchRequest = React.useMemo(
    () => ({
      filters: {
        ...(filterData.username && { username: filterData.username }),
        ...(filterData.statuses.length > 0 && { status: filterData.statuses }),
      },
      sort: { by: sortField, order: sortDirection },
      pagination: { limit: perPage, offset: (page - 1) * perPage },
    }),
    [filterData, sortField, sortDirection, page, perPage],
  );

  const [response, loaded, error, refresh] = useFetchApiKeys(searchRequest);

  React.useEffect(() => {
    setIsFetching(false);
  }, [response]);

  const onUsernameChange = React.useCallback(
    (value: string) => {
      setFilterData((prev) => ({ ...prev, username: value }));
      setPage(1);
      setIsFetching(value !== localUsername);
    },
    [localUsername],
  );

  const onStatusToggle = React.useCallback((status: APIKeyStatus) => {
    setFilterData((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }));
    setPage(1);
    setIsFetching(true);
  }, []);

  const onStatusClear = React.useCallback((status: APIKeyStatus) => {
    setFilterData((prev) => ({
      ...prev,
      statuses: prev.statuses.filter((s) => s !== status),
    }));
    setPage(1);
    setIsFetching(true);
  }, []);

  const onSort = React.useCallback((field: ApiKeySortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    setPage(1);
    setIsFetching(true);
  }, []);

  const onSetPage = React.useCallback((newPage: number) => {
    setPage(newPage);
    setIsFetching(true);
  }, []);

  const onPerPageSelect = React.useCallback((newPerPage: number, newPage: number) => {
    setPerPage(newPerPage);
    setPage(Math.max(1, newPage));
    setIsFetching(true);
  }, []);

  const onClearFilters = React.useCallback(() => {
    setFilterData(emptyApiKeyFilterData);
    setPage(1);
    setLocalUsername('');
    setIsFetching(true);
  }, []);

  return {
    response,
    loaded,
    error,
    refresh,
    filterData,
    localUsername,
    setLocalUsername,
    page,
    perPage,
    sortField,
    sortDirection,
    isFetching,
    onUsernameChange,
    onStatusToggle,
    onStatusClear,
    onSort,
    onSetPage,
    onPerPageSelect,
    onClearFilters,
  };
};
